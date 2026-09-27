'use strict';

const mysql = require('mysql');
const configureQueryFormat = require('./query-format');
const output = require('./output');

function createExecutor(configuration) {
  let sqlResults = 0;
  let lastInsertId = null;

  function execute(sql, values, shouldEscape, callback) {
    const connection = mysql.createConnection(configuration.connectionOptions());

    configureQueryFormat(connection);

    function complete(error, result, fields) {
      if (!error && result) {
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

    connection.end();
  }

  const executor = {
    results: () => sqlResults,
    lastInsertId: () => lastInsertId,
    setLastInsertId: (value) => {
      lastInsertId = value;
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

          resolve({ result, fields });
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

          resolve({ result, fields });
        });
      });
    },
  };

  return executor;
}

module.exports = { createExecutor };
