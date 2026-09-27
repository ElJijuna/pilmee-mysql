'use strict';

function queryFormat(query, values) {
  // mysql2 passes [] when a query has no values; only plain objects hold named parameters.
  if (!values || Array.isArray(values)) {
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

module.exports = { queryFormat };
