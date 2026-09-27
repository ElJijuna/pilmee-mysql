'use strict';

var util = require('util');
require('colors');

exports.connectionEstablished = function connectionEstablished(counter) {
  util.log('Connection established  ['.yellow + ' #' + counter + ' ]'.yellow);
};

exports.connectionClosed = function connectionClosed() {
  util.log('Connection closed'.yellow);
};

exports.sql = function sql(statement) {
  console.log('\n │ \n │ SQL DEBUG\n │ \n │→ ' + statement + '\n │ \n | --- end ---\n │\n');
};

exports.legend = function legend() {
  console.log('┌───────────────────────────────────────────────┐'.bold.cyan);
  console.log('│    LIBRARY TO MANAGE MYSQL (pilmee-mysql)     │'.bold.cyan);
  console.log('│       ☺ Create by PiLMee → @pilmee            │'.bold.cyan);
  console.log('│             pilmee@gmail.com                  │'.bold.cyan);
  console.log('└───────────────────────────────────────────────┘\n'.bold.cyan);
};

exports.list = function list(result, keyName, displayName, callback) {
  console.log(
    '\n─────────────────────────────────────────────────\nSQL Data List\n─────────────────────────────────────────────────\n'
      .bold.green,
  );
  console.log('  #\tKEY\tDISPLAY NAME'.bold.magenta);
  var position = 1;

  for (var element in result) {
    console.log(
      '→ ' + position + '.\t' + result[element][keyName] + '\t' + result[element][displayName],
    );
    position++;
  }

  callback();
  console.log('─────────────────────────────────────────────────'.bold.green);
};
