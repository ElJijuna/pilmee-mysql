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

  function execute(sql, values, shouldEscape, callback) {
    const usePool = Boolean(configuration.get('pool'));
    const connection = usePool
      ? getPool()
      : mysql.createConnection({ ...configuration.connectionOptions(), queryFormat });

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
      output.sql(sql);
    }

    if (!usePool) {
      connection.end();
    }
  }

  const executor = {
    results: () => sqlResults,
    lastInsertId: () => lastInsertId,
    setLastInsertId: (value) => {
      lastInsertId = value;
    },
    // Closes pooled connections; later queries open a new pool if pooling is still enabled.
    end(callback = () => {}) {
      closePool((error) => callback(error || null));
    },
    endAsync() {
      return new Promise((resolve, reject) => {
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
  };

  return executor;
}

module.exports = { createExecutor };
