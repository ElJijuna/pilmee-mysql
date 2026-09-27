'use strict';

const colors = require('colors/safe');

exports.sql = function sql(statement) {
  console.log(`\n │ \n │ SQL DEBUG\n │ \n │→ ${statement}\n │ \n | --- end ---\n │\n`);
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
  let position = 1;

  for (const element in result) {
    console.log(`→ ${position}.\t${result[element][keyName]}\t${result[element][displayName]}`);
    position++;
  }

  callback();
  console.log(colors.green(colors.bold('─────────────────────────────────────────────────')));
};
