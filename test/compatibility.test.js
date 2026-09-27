'use strict';

var assert = require('node:assert/strict');
var test = require('node:test');
var mysql = require('mysql');
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
  var fake = {
    config: {},
    query: (sql, callback) => {
      events.push(['query', sql]);
      callback(null, [{ id: 1 }, { id: 2 }], ['fields']);
    },
    end: () => {
      events.push('end');
    },
    escape: (value) => `<${value}>`,
  };
  mysql.createConnection = () => fake;

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
  assert.equal(fake.config.queryFormat.call(fake, 'SELECT :id', { id: 7 }), 'SELECT <7>');
});

test('passes runEscape values through the configured query formatter', () => {
  var original = mysql.createConnection;
  var queryArguments;
  var fake = {
    config: {},
    connect: () => {},
    end: () => {},
    escape: (value) => `<${value}>`,
    query: (...args) => {
      queryArguments = args.slice(0, 2);
      args[2](null, [], []);
    },
  };
  mysql.createConnection = () => fake;

  try {
    db.runEscape('SELECT ?', { id: 7 }, () => {});
  } finally {
    mysql.createConnection = original;
  }

  assert.deepEqual(queryArguments, ['SELECT ?', { id: 7 }]);
  assert.equal(fake.config.queryFormat.call(fake, 'SELECT :id', { id: 7 }), 'SELECT <7>');
  assert.equal(db.results(), 0);
});

test('tracks affected rows and the last insert id for write results', () => {
  const original = mysql.createConnection;
  const fake = {
    config: {},
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
    config: {},
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
    config: {},
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
      });
    });
  } finally {
    mysql.createConnection = original;
  }

  assert.match(await db.toXMLAsync({ item: 'value' }), /^<\?xml version='1\.0'/);
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
