'use strict';

var util = require('util');
var colors = require('colors/safe');

exports.connectionEstablished = function connectionEstablished(counter) {
  util.log(colors.yellow('Connection established  [ #' + counter + ' ]'));
};

exports.connectionClosed = function connectionClosed() {
  util.log(colors.yellow('Connection closed'));
};

exports.sql = function sql(statement) {
  console.log('\n │ \n │ SQL DEBUG\n │ \n │→ ' + statement + '\n │ \n | --- end ---\n │\n');
};

exports.legend = function legend() {
  console.log(colors.cyan(colors.bold('┌───────────────────────────────────────────────┐')));
  console.log(colors.cyan(colors.bold('│    LIBRARY TO MANAGE MYSQL (pilmee-mysql)     │')));
  console.log(colors.cyan(colors.bold('│       ☺ Create by PiLMee → @pilmee            │')));
  console.log(colors.cyan(colors.bold('│             pilmee@gmail.com                  │')));
  console.log(colors.cyan(colors.bold('└───────────────────────────────────────────────┘\n')));
};

exports.list = function list(result, keyName, displayName, callback) {
  console.log(
    colors.green(
      colors.bold(
        '\n─────────────────────────────────────────────────\nSQL Data List\n─────────────────────────────────────────────────\n',
      ),
    ),
  );
  console.log(colors.magenta(colors.bold('  #\tKEY\tDISPLAY NAME')));
  var position = 1;

  for (var element in result) {
    console.log(
      '→ ' + position + '.\t' + result[element][keyName] + '\t' + result[element][displayName],
    );
    position++;
  }

  callback();
  console.log(colors.green(colors.bold('─────────────────────────────────────────────────')));
};
