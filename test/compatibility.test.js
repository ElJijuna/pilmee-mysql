'use strict';

var assert = require('node:assert/strict');
var test = require('node:test');
var mysql = require('mysql2');
var db = require('..');
var { queryFormat } = require('../src/query-format');

test('preserves the public CommonJS interface', () => {
  assert.deepEqual(Object.keys(db), [
    'lastInsertId',
    'results',
    'configure',
    'set',
    'get',
    'changeUser',
    'run',
    'runEscape',
    'runAsync',
    'runEscapeAsync',
    'transaction',
    'end',
    'endAsync',
    'list',
    'toXML',
    'toXMLAsync',
    'createClient',
  ]);
  assert.equal(db.lastInsertId, null);
});

test('preserves configuration and synchronous configure callback', () => {
  var called = false;
  db.configure(() => {
    called = true;
  });
  assert.equal(called, true);
  assert.deepEqual(
    ['host', 'port', 'debug', 'format', 'timezone'].map((key) => db.get(key)),
    ['', 3306, false, 'json', 'local'],
  );
  assert.equal(db.set('customOption', 42).customOption, 42);
  assert.equal(db.get('customOption'), 42);
});

test('delegates changeUser and returns undefined', () => {
  var received;

  var callback = () => {};

  var connection = {
    changeUser: (values, cb) => {
      received = [values, cb];
    },
  };
  assert.equal(db.changeUser(connection, { database: 'next' }, callback), undefined);
  assert.deepEqual(received, [{ database: 'next' }, callback]);
});

test('runs queries, closes connections, and formats named parameters', () => {
  var original = mysql.createConnection;
  var events = [];
  var callbackArguments;
  var options;
  var fake = {
    query: (sql, callback) => {
      events.push(['query', sql]);
      callback(null, [{ id: 1 }, { id: 2 }], ['fields']);
    },
    end: () => {
      events.push('end');
    },
    escape: (value) => `<${value}>`,
  };

  mysql.createConnection = (value) => {
    options = value;

    return fake;
  };

  try {
    assert.equal(
      db.run('SELECT :id', (...args) => {
        callbackArguments = args;
      }),
      undefined,
    );
  } finally {
    mysql.createConnection = original;
  }

  assert.deepEqual(events, [['query', 'SELECT :id'], 'end']);
  assert.deepEqual(callbackArguments, [null, [{ id: 1 }, { id: 2 }], ['fields']]);
  assert.equal(db.results(), 2);
  assert.equal(options.queryFormat.call(fake, 'SELECT :id', { id: 7 }), 'SELECT <7>');
});

test('passes runEscape values through the configured query formatter', () => {
  var original = mysql.createConnection;
  var queryArguments;
  var options;
  var fake = {
    connect: () => {},
    end: () => {},
    escape: (value) => `<${value}>`,
    query: (...args) => {
      queryArguments = args.slice(0, 2);
      args[2](null, [], []);
    },
  };

  mysql.createConnection = (value) => {
    options = value;

    return fake;
  };

  try {
    db.runEscape('SELECT ?', { id: 7 }, () => {});
  } finally {
    mysql.createConnection = original;
  }

  assert.deepEqual(queryArguments, ['SELECT ?', { id: 7 }]);
  assert.equal(options.queryFormat.call(fake, 'SELECT :id', { id: 7 }), 'SELECT <7>');
  assert.equal(db.results(), 0);
});

test('tracks affected rows and the last insert id for write results', () => {
  const original = mysql.createConnection;
  const fake = {
    connect: () => {},
    end: () => {},
    query: (_sql, callback) => callback(null, { affectedRows: 3, insertId: 27 }, []),
  };

  mysql.createConnection = () => fake;

  try {
    db.run('INSERT INTO items VALUES (1)', () => {});
  } finally {
    mysql.createConnection = original;
  }

  assert.equal(db.results(), 3);
  assert.equal(db.lastInsertId, 27);
});

test('does not mask driver errors when no result is returned', () => {
  const original = mysql.createConnection;
  const expectedError = new Error('query failed');

  let receivedError;

  const fake = {
    connect: () => {},
    end: () => {},
    query: (_sql, callback) => callback(expectedError),
  };

  mysql.createConnection = () => fake;

  try {
    db.run('INVALID', (error) => {
      receivedError = error;
    });
  } finally {
    mysql.createConnection = original;
  }

  assert.equal(receivedError, expectedError);
});

test('provides additive Promise interfaces', async () => {
  const original = mysql.createConnection;
  const fake = {
    connect: () => {},
    end: () => {},
    query: (_sql, callback) => callback(null, [{ id: 1 }], ['fields']),
  };

  mysql.createConnection = () => fake;

  try {
    await assert.doesNotReject(async () => {
      assert.deepEqual(await db.runAsync('SELECT 1'), {
        result: [{ id: 1 }],
        fields: ['fields'],
        count: 1,
        insertId: null,
      });
    });
  } finally {
    mysql.createConnection = original;
  }

  assert.match(await db.toXMLAsync({ item: 'value' }), /^<\?xml version='1\.0'/);
});

test('returns per-query metadata that is not affected by concurrent queries', async () => {
  const original = mysql.createConnection;
  const client = db.createClient();
  const pending = [];

  mysql.createConnection = () => ({
    end: () => {},
    query: (sql, callback) => pending.push({ sql, callback }),
  });

  try {
    const first = client.runAsync('INSERT first');
    const second = client.runAsync('INSERT second');

    pending[0].callback(null, { affectedRows: 1, insertId: 10 }, undefined);
    pending[1].callback(null, { affectedRows: 2, insertId: 20 }, undefined);

    const [firstResponse, secondResponse] = await Promise.all([first, second]);

    assert.equal(firstResponse.insertId, 10);
    assert.equal(firstResponse.count, 1);
    assert.equal(secondResponse.insertId, 20);
    assert.equal(secondResponse.count, 2);
    assert.equal(client.lastInsertId, 20);
  } finally {
    mysql.createConnection = original;
  }
});

test('reuses a pool with named parameters when pool is enabled', async () => {
  const originalPool = mysql.createPool;
  const originalConnection = mysql.createConnection;
  const created = [];

  let ended = 0;

  mysql.createConnection = () => {
    throw new Error('should not open a standalone connection');
  };

  mysql.createPool = (options) => {
    const pool = {
      options,
      query: (_sql, _values, callback) => callback(null, [{ id: 1 }], []),
      end: (callback) => {
        ended++;
        process.nextTick(callback);
      },
    };

    created.push(pool);

    return pool;
  };

  try {
    const client = db.createClient({ host: 'pool.example', pool: true, connectionLimit: 3 });

    await client.runEscapeAsync('SELECT :id', { id: 1 });
    await client.runEscapeAsync('SELECT :id', { id: 2 });

    assert.equal(created.length, 1);
    assert.equal(created[0].options.host, 'pool.example');
    assert.equal(created[0].options.connectionLimit, 3);
    assert.equal(
      created[0].options.queryFormat.call({ escape: (value) => `<${value}>` }, 'SELECT :id', {
        id: 7,
      }),
      'SELECT <7>',
    );

    client.set('database', 'other');
    await client.runEscapeAsync('SELECT :id', { id: 3 });

    assert.equal(created.length, 2, 'changing connection settings reopens the pool');
    assert.equal(created[1].options.database, 'other');

    await client.endAsync();

    assert.equal(ended, 2);
  } finally {
    mysql.createPool = originalPool;
    mysql.createConnection = originalConnection;
  }
});

test('end is a no-op without a pool', async () => {
  const client = db.createClient();

  await assert.doesNotReject(client.endAsync());
  await new Promise((resolve) => {
    client.end((error) => {
      assert.equal(error, null);
      resolve();
    });
  });
});

test('debugSQL logs the SQL with named parameters substituted', () => {
  const original = mysql.createConnection;
  const originalLog = console.log;
  const logged = [];
  const client = db.createClient({ debugSQL: true });

  mysql.createConnection = () => ({
    end: () => {},
    query: (...args) => args.at(-1)(null, [], []),
  });
  console.log = (message) => logged.push(message);

  try {
    client.runEscape(
      'SELECT * FROM t WHERE name = :name AND id = :id',
      { name: "O'Hara", id: 3 },
      () => {},
    );
    client.run('SELECT :raw', () => {});
  } finally {
    mysql.createConnection = original;
    console.log = originalLog;
  }

  assert.match(logged[0], /SELECT \* FROM t WHERE name = 'O\\'Hara' AND id = 3/);
  assert.match(logged[1], /SELECT :raw/);
});

test('leaves placeholders untouched when the driver passes no named values', () => {
  const connection = { escape: (value) => `<${value}>` };

  assert.equal(queryFormat.call(connection, 'SELECT :length, :id', []), 'SELECT :length, :id');
  assert.equal(queryFormat.call(connection, 'SELECT :id', undefined), 'SELECT :id');
});

function createTransactionConnection({ failRollback = false } = {}) {
  const events = [];
  const connection = {
    events,
    beginTransaction: (callback) => {
      events.push('begin');
      callback(null);
    },
    commit: (callback) => {
      events.push('commit');
      callback(null);
    },
    rollback: (callback) => {
      events.push('rollback');
      callback(failRollback ? new Error('rollback failed') : null);
    },
    query: (sql, ...args) => {
      events.push(sql);
      args.at(-1)(null, { affectedRows: 1, insertId: 5 }, undefined);
    },
    end: () => events.push('end'),
    destroy: () => events.push('destroy'),
    release: () => events.push('release'),
  };

  return connection;
}

async function withStandaloneConnection(connection, run) {
  const original = mysql.createConnection;

  mysql.createConnection = () => connection;

  try {
    await run(db.createClient());
  } finally {
    mysql.createConnection = original;
  }
}

test('commits a transaction and returns the work result', async () => {
  const connection = createTransactionConnection();

  await withStandaloneConnection(connection, async (client) => {
    const value = await client.transaction(async (tx) => {
      const { insertId } = await tx.runEscapeAsync('INSERT :a', { a: 1 });

      await tx.runAsync('UPDATE b');

      return insertId;
    });

    assert.equal(value, 5);
  });

  assert.deepEqual(connection.events, ['begin', 'INSERT :a', 'UPDATE b', 'commit', 'end']);
});

test('rolls back and rethrows when the work fails', async () => {
  const connection = createTransactionConnection();
  const failure = new Error('boom');

  await withStandaloneConnection(connection, async (client) => {
    await assert.rejects(
      client.transaction(async (tx) => {
        await tx.runAsync('INSERT a');

        throw failure;
      }),
      failure,
    );
  });

  assert.deepEqual(connection.events, ['begin', 'INSERT a', 'rollback', 'destroy']);
});

test('reports the original error when the rollback also fails', async () => {
  const connection = createTransactionConnection({ failRollback: true });
  const failure = new Error('original');

  await withStandaloneConnection(connection, async (client) => {
    await assert.rejects(
      client.transaction(async () => {
        throw failure;
      }),
      failure,
    );
  });
});

test('rejects queries on a finished transaction', async () => {
  const connection = createTransactionConnection();

  let leaked;

  await withStandaloneConnection(connection, async (client) => {
    await client.transaction(async (tx) => {
      leaked = tx;
    });
  });

  await assert.rejects(leaked.runAsync('SELECT 1'), /Transaction already finished/);
});

test('borrows and releases a pooled connection for transactions', async () => {
  const originalPool = mysql.createPool;
  const connection = createTransactionConnection();

  mysql.createPool = () => ({
    getConnection: (callback) => callback(null, connection),
    end: (callback) => process.nextTick(callback),
  });

  try {
    const client = db.createClient({ pool: true });

    await client.transaction(async (tx) => {
      await tx.runAsync('INSERT a');
    });
    await client.endAsync();
  } finally {
    mysql.createPool = originalPool;
  }

  assert.deepEqual(connection.events, ['begin', 'INSERT a', 'commit', 'release']);
});

test('end waits for running transactions before closing the pool', async () => {
  const originalPool = mysql.createPool;
  const connection = createTransactionConnection();
  const { events } = connection;

  let finishWork;

  mysql.createPool = () => ({
    getConnection: (callback) => callback(null, connection),
    end: (callback) => {
      events.push('pool end');
      process.nextTick(callback);
    },
  });

  try {
    const client = db.createClient({ pool: true });
    const running = client.transaction(async (tx) => {
      await tx.runAsync('INSERT a');
      await new Promise((resolve) => {
        finishWork = resolve;
      });
      await tx.runAsync('INSERT b');
    });

    await new Promise((resolve) => setImmediate(resolve));

    const ending = client.endAsync();

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(events.includes('pool end'), false, 'pool stays open while the transaction runs');

    finishWork();
    await Promise.all([running, ending]);
  } finally {
    mysql.createPool = originalPool;
  }

  assert.deepEqual(events, ['begin', 'INSERT a', 'INSERT b', 'commit', 'release', 'pool end']);
});

test('end still closes the pool when a running transaction fails', async () => {
  const originalPool = mysql.createPool;

  let poolEnded = false;

  mysql.createPool = () => ({
    getConnection: (callback) => callback(null, createTransactionConnection()),
    end: (callback) => {
      poolEnded = true;
      process.nextTick(callback);
    },
  });

  try {
    const client = db.createClient({ pool: true });
    const running = client.transaction(async () => {
      throw new Error('boom');
    });
    const ending = client.endAsync();

    await assert.rejects(running, /boom/);
    await ending;
  } finally {
    mysql.createPool = originalPool;
  }

  assert.equal(poolEnded, true);
});

test('creates clients with isolated configuration and result state', () => {
  const first = db.createClient({ host: 'first.example' });
  const second = db.createClient({ host: 'second.example' });

  first.set('database', 'first_database');
  first.lastInsertId = 99;

  assert.equal(first.get('host'), 'first.example');
  assert.equal(second.get('host'), 'second.example');
  assert.equal(first.get('database'), 'first_database');
  assert.equal(second.get('database'), '');
  assert.equal(first.lastInsertId, 99);
  assert.equal(second.lastInsertId, null);
});

test('preserves XML callback output', () => {
  var result;
  db.toXML({ item: 'value' }, (value) => {
    result = value;
  });
  assert.match(result, /^<\?xml version='1\.0' encoding='ISO-8859-1'\?>\n/);
});
