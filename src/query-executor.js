'use strict';

const mysql = require('mysql');
const configuration = require('./configuration');
const configureQueryFormat = require('./query-format');
const output = require('./output');

let sqlResults = 0;
let lastInsertId = null;

function createConnection() {
  return mysql.createConnection(configuration.connectionOptions());
}

function execute(sql, values, shouldEscape, callback) {
  const cnx = createConnection();

  configureQueryFormat(cnx);

  function complete(err, result, headers) {
    if (!err && result) {
      if (Array.isArray(result)) {
        sqlResults = result.length;
      } else if (typeof result.affectedRows === 'number') {
        sqlResults = result.affectedRows;
      } else {
        sqlResults = 0;
      }

      if (typeof result.insertId === 'number') {
        lastInsertId = result.insertId;
      }
    }

    callback(err, result, headers);
  }

  if (shouldEscape) {
    cnx.query(sql, values, complete);
  } else {
    cnx.query(sql, complete);
  }

  if (configuration.get('debugSQL')) {
    output.sql(sql);
  }

  cnx.end();
}

exports.results = function results() {
  return sqlResults;
};

exports.lastInsertId = function getLastInsertId() {
  return lastInsertId;
};

exports.setLastInsertId = function setLastInsertId(value) {
  lastInsertId = value;
};

exports.run = function run(sql, callback) {
  execute(sql, undefined, false, callback);
};

exports.runEscape = function runEscape(sql, values, callback) {
  execute(sql, values, true, callback);
};

exports.runAsync = function runAsync(sql) {
  return new Promise((resolve, reject) => {
    exports.run(sql, (error, result, fields) => {
      if (error) {
        reject(error);

        return;
      }

      resolve({ result, fields });
    });
  });
};

exports.runEscapeAsync = function runEscapeAsync(sql, values) {
  return new Promise((resolve, reject) => {
    exports.runEscape(sql, values, (error, result, fields) => {
      if (error) {
        reject(error);

        return;
      }

      resolve({ result, fields });
    });
  });
};
