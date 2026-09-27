'use strict';

module.exports = function configureQueryFormat(connection) {
  connection.config.queryFormat = function queryFormat(query, values) {
    if (!values) {
      return query;
    }

    return query.replace(
      /:(\w+)/g,
      function replaceParameter(text, key) {
        if (Object.prototype.hasOwnProperty.call(values, key)) {
          return this.escape(values[key]);
        }

        return text;
      }.bind(this),
    );
  };
};
