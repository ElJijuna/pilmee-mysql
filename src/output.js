'use strict';

const { styleText } = require('node:util');

function bold(color, text) {
  return styleText(color, styleText('bold', text));
}

exports.sql = function sql(statement) {
  console.log(`\n │ \n │ SQL DEBUG\n │ \n │→ ${statement}\n │ \n | --- end ---\n │\n`);
};

exports.list = function list(result, keyName, displayName, callback) {
  console.log(
    bold(
      'green',
      '\n─────────────────────────────────────────────────\nSQL Data List\n─────────────────────────────────────────────────\n',
    ),
  );
  console.log(bold('magenta', '  #\tKEY\tDISPLAY NAME'));
  let position = 1;

  for (const element in result) {
    console.log(`→ ${position}.\t${result[element][keyName]}\t${result[element][displayName]}`);
    position++;
  }

  callback();
  console.log(bold('green', '─────────────────────────────────────────────────'));
};
