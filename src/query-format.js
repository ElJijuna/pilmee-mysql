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

module.exports = { queryFormat };
