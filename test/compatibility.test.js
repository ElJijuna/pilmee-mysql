'use strict';

var assert = require('node:assert/strict');
var test = require('node:test');
var mysql = require('mysql2');
var db = require('..');

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
