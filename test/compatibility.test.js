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
    'list',
    'toXML',
  ]);
  assert.equal(require('../pilmee-mysql'), db);
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

test('preserves run lifecycle and named query formatting', () => {
  var original = mysql.createConnection;
  var events = [];
  var callbackArguments;
  var fake = {
    config: {},
    connect: () => {
      events.push('connect');
    },
    query: (sql, callback) => {
      events.push(['query', sql]);
      callback(null, [{ id: 1 }, { id: 2 }], ['fields']);
    },
    end: () => {
      events.push('end');
    },
    escape: (value) => '<' + value + '>',
  };
  mysql.createConnection = () => fake;

  try {
    assert.equal(
      db.run('SELECT :id', function () {
        callbackArguments = Array.prototype.slice.call(arguments);
      }),
      undefined,
    );
  } finally {
    mysql.createConnection = original;
  }

  assert.deepEqual(events, ['connect', ['query', 'SELECT :id'], 'end']);
  assert.deepEqual(callbackArguments, [null, [{ id: 1 }, { id: 2 }], ['fields']]);
  assert.equal(db.results(), 2);
  assert.equal(fake.config.queryFormat.call(fake, 'SELECT :id', { id: 7 }), 'SELECT <7>');
});

test('preserves runEscape escaping and query overload', () => {
  var original = mysql.createConnection;
  var queryArguments;
  var fake = {
    config: {},
    connect: () => {},
    end: () => {},
    escape: (values) => 'escaped:' + values.id,
    query: function () {
      queryArguments = Array.prototype.slice.call(arguments, 0, 2);
      arguments[2](null, [], []);
    },
  };
  mysql.createConnection = () => fake;

  try {
    db.runEscape('SELECT ?', { id: 7 }, () => {});
  } finally {
    mysql.createConnection = original;
  }

  assert.deepEqual(queryArguments, ['SELECT ?', 'escaped:7']);
  assert.equal(db.results(), 0);
});

test('preserves XML callback output', () => {
  var result;
  db.toXML({ item: 'value' }, (value) => {
    result = value;
  });
  assert.match(result, /^<\?xml version='1\.0' encoding='ISO-8859-1'\?>\n/);
});
