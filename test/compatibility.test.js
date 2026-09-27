'use strict';

var assert = require('node:assert/strict');
var test = require('node:test');
var mysql = require('mysql');
var db = require('..');

test('preserves the public CommonJS interface', function () {
  assert.deepEqual(Object.keys(db), [
    'lastInsertId', 'results', 'configure', 'set', 'get', 'changeUser',
    'run', 'runEscape', 'list', 'toXML'
  ]);
  assert.equal(require('../pilmee-mysql'), db);
  assert.equal(db.lastInsertId, null);
});

test('preserves configuration and synchronous configure callback', function () {
  var called = false;
  db.configure(function () { called = true; });
  assert.equal(called, true);
  assert.deepEqual(
    ['host', 'port', 'debug', 'format', 'timezone'].map(function (key) { return db.get(key); }),
    ['', 3306, false, 'json', 'local']
  );
  assert.equal(db.set('customOption', 42).customOption, 42);
  assert.equal(db.get('customOption'), 42);
});

test('delegates changeUser and returns undefined', function () {
  var received;
  var callback = function () {};
  var connection = { changeUser: function (values, cb) { received = [values, cb]; } };
  assert.equal(db.changeUser(connection, { database: 'next' }, callback), undefined);
  assert.deepEqual(received, [{ database: 'next' }, callback]);
});

test('preserves run lifecycle and named query formatting', function () {
  var original = mysql.createConnection;
  var events = [];
  var callbackArguments;
  var fake = {
    config: {},
    connect: function () { events.push('connect'); },
    query: function (sql, callback) {
      events.push(['query', sql]);
      callback(null, [{ id: 1 }, { id: 2 }], ['fields']);
    },
    end: function () { events.push('end'); },
    escape: function (value) { return '<' + value + '>'; }
  };
  mysql.createConnection = function () { return fake; };
  try {
    assert.equal(db.run('SELECT :id', function () {
      callbackArguments = Array.prototype.slice.call(arguments);
    }), undefined);
  } finally {
    mysql.createConnection = original;
  }
  assert.deepEqual(events, ['connect', ['query', 'SELECT :id'], 'end']);
  assert.deepEqual(callbackArguments, [null, [{ id: 1 }, { id: 2 }], ['fields']]);
  assert.equal(db.results(), 2);
  assert.equal(fake.config.queryFormat.call(fake, 'SELECT :id', { id: 7 }), 'SELECT <7>');
});

test('preserves runEscape escaping and query overload', function () {
  var original = mysql.createConnection;
  var queryArguments;
  var fake = {
    config: {}, connect: function () {}, end: function () {},
    escape: function (values) { return 'escaped:' + values.id; },
    query: function () {
      queryArguments = Array.prototype.slice.call(arguments, 0, 2);
      arguments[2](null, [], []);
    }
  };
  mysql.createConnection = function () { return fake; };
  try { db.runEscape('SELECT ?', { id: 7 }, function () {}); }
  finally { mysql.createConnection = original; }
  assert.deepEqual(queryArguments, ['SELECT ?', 'escaped:7']);
  assert.equal(db.results(), 0);
});

test('preserves XML callback output', function () {
  var result;
  db.toXML({ item: 'value' }, function (value) { result = value; });
  assert.match(result, /^<\?xml version='1\.0' encoding='ISO-8859-1'\?>\n/);
});
