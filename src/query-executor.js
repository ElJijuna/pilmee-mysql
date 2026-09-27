'use strict';

var mysql = require('mysql');
var configuration = require('./configuration');
var configureQueryFormat = require('./query-format');
var output = require('./output');

var counter = 0;
var sqlResults = 0;

function connection() {
  counter++;

  return mysql.createConnection(configuration.connectionOptions());
}

function execute(sql, values, shouldEscape, callback) {
  var cnx = new connection();
  configureQueryFormat(cnx);
  cnx.connect(function messageConnect() {
    output.connectionEstablished(counter);
  });

  function complete(err, result, headers) {
    sqlResults = result.length;
    callback(err, result, headers);
  }

  if (shouldEscape) {
    cnx.query(sql, cnx.escape(values), complete);
  } else {
    cnx.query(sql, complete);
  }

  if (configuration.get('debugSQL')) {
    output.sql(sql);
  }

  cnx.end(output.connectionClosed);
}

exports.results = function results() {
  return sqlResults;
};

exports.run = function run(sql, callback) {
  execute(sql, undefined, false, callback);
};

exports.runEscape = function runEscape(sql, values, callback) {
  execute(sql, values, true, callback);
};
