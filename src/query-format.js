'use strict';

function queryFormat(query, values) {
  if (!values) {
    return query;
  }

  return query.replace(
    /:(\w+)/g,
    function replaceParameter(text, key) {
      if (Object.hasOwn(values, key)) {
        return this.escape(values[key]);
      }

      return text;
    }.bind(this),
  );
}

function configureQueryFormat(connection) {
  connection.config.queryFormat = queryFormat;
}

module.exports = configureQueryFormat;
module.exports.queryFormat = queryFormat;
