'use strict';

const mysql = require('mysql2');
const { queryFormat } = require('./query-format');
const output = require('./output');

function describeResult(result) {
  let count = 0;

  if (Array.isArray(result)) {
    count = result.length;
  } else if (typeof result.affectedRows === 'number') {
    count = result.affectedRows;
  }

  return {
    count,
    insertId: typeof result.insertId === 'number' ? result.insertId : null,
  };
}

function toResponse(result, fields) {
  return { result, fields, ...describeResult(result || {}) };
}

function createExecutor(configuration) {
  let sqlResults = 0;
  let lastInsertId = null;
  let pool = null;

  const pendingTransactions = new Set();

  function getPool() {
    if (!pool) {
      pool = mysql.createPool({ ...configuration.poolOptions(), queryFormat });
    }

    return pool;
  }

  function closePool(callback) {
    const current = pool;

    pool = null;

    if (!current) {
      process.nextTick(callback);

      return;
    }

    current.end(callback);
  }

  // Same formatting the driver applies, so the debug log shows the SQL actually sent.
  function formatForLog(sql, values) {
    const timezone = configuration.get('timezone');

    return queryFormat.call(
      { escape: (value) => mysql.escape(value, false, timezone) },
      sql,
      values,
    );
  }

  function query(connection, sql, values, shouldEscape, callback) {
    function complete(error, result, fields) {
      if (!error && result) {
        const metadata = describeResult(result);

        sqlResults = metadata.count;

        if (metadata.insertId !== null) {
          lastInsertId = metadata.insertId;
        }
      }

      callback(error, result, fields);
    }

    if (shouldEscape) {
      connection.query(sql, values, complete);
    } else {
      connection.query(sql, complete);
    }

    if (configuration.get('debugSQL')) {
      output.sql(shouldEscape ? formatForLog(sql, values) : sql);
    }
  }

  function queryAsync(connection, sql, values, shouldEscape) {
    return new Promise((resolve, reject) => {
      query(connection, sql, values, shouldEscape, (error, result, fields) => {
        if (error) {
          reject(error);

          return;
        }

        resolve(toResponse(result, fields));
      });
    });
  }

  function execute(sql, values, shouldEscape, callback) {
    const usePool = Boolean(configuration.get('pool'));
    const connection = usePool
      ? getPool()
      : mysql.createConnection({ ...configuration.connectionOptions(), queryFormat });

    query(connection, sql, values, shouldEscape, callback);

    if (!usePool) {
      connection.end();
    }
  }

  // A transaction needs every statement on the same connection: borrow one from the pool
  // or open a dedicated one.
  function acquireConnection() {
    if (!configuration.get('pool')) {
      const connection = mysql.createConnection({
        ...configuration.connectionOptions(),
        queryFormat,
      });

      return Promise.resolve({
        connection,
        release: (failed) => (failed ? connection.destroy() : connection.end(() => {})),
      });
    }

    return new Promise((resolve, reject) => {
      getPool().getConnection((error, connection) => {
        if (error) {
          reject(error);

          return;
        }

        resolve({ connection, release: () => connection.release() });
      });
    });
  }

  function callConnection(connection, method) {
    return new Promise((resolve, reject) => {
      connection[method]((error) => (error ? reject(error) : resolve()));
    });
  }

  // Tracks running transactions so end() can wait for them instead of cutting their connection.
  async function transaction(work) {
    const running = runTransaction(work);

    pendingTransactions.add(running);

    try {
      return await running;
    } finally {
      pendingTransactions.delete(running);
    }
  }

  async function runTransaction(work) {
    const { connection, release } = await acquireConnection();

    let active = true;
    let failed = false;

    function ensureActive() {
      if (!active) {
        throw new Error('Transaction already finished');
      }
    }

    const tx = {
      async runAsync(sql) {
        ensureActive();

        return queryAsync(connection, sql, undefined, false);
      },
      async runEscapeAsync(sql, values) {
        ensureActive();

        return queryAsync(connection, sql, values, true);
      },
    };

    try {
      await callConnection(connection, 'beginTransaction');

      const value = await work(tx);

      await callConnection(connection, 'commit');

      return value;
    } catch (error) {
      failed = true;

      try {
        await callConnection(connection, 'rollback');
      } catch {
        // Report the original failure even if the rollback itself fails.
      }

      throw error;
    } finally {
      active = false;
      release(failed);
    }
  }

  const executor = {
    results: () => sqlResults,
    lastInsertId: () => lastInsertId,
    setLastInsertId: (value) => {
      lastInsertId = value;
    },
    // Waits for running transactions, then closes pooled connections. Later queries open a new
    // pool if pooling is still enabled.
    async end(callback = () => {}) {
      let failure = null;

      try {
        await executor.endAsync();
      } catch (error) {
        failure = error;
      }

      callback(failure);
    },
    async endAsync() {
      await Promise.allSettled(pendingTransactions);
      await new Promise((resolve, reject) => {
        closePool((error) => (error ? reject(error) : resolve()));
      });
    },
    resetPool() {
      if (pool) {
        closePool(() => {});
      }
    },
    run(sql, callback) {
      execute(sql, undefined, false, callback);
    },
    runEscape(sql, values, callback) {
      execute(sql, values, true, callback);
    },
    runAsync(sql) {
      return new Promise((resolve, reject) => {
        executor.run(sql, (error, result, fields) => {
          if (error) {
            reject(error);

            return;
          }

          resolve(toResponse(result, fields));
        });
      });
    },
    runEscapeAsync(sql, values) {
      return new Promise((resolve, reject) => {
        executor.runEscape(sql, values, (error, result, fields) => {
          if (error) {
            reject(error);

            return;
          }

          resolve(toResponse(result, fields));
        });
      });
    },
    transaction,
  };

  return executor;
}

module.exports = { createExecutor };
