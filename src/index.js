'use strict';

const { createConfiguration, connectionKeys } = require('./configuration');
const { createExecutor } = require('./query-executor');
const output = require('./output');
const xml = require('./xml');

function createClient(options = {}) {
  const configuration = createConfiguration(options);
  const executor = createExecutor(configuration);
  const client = {};

  Object.defineProperty(client, 'lastInsertId', {
    enumerable: true,
    get: executor.lastInsertId,
    set: executor.setLastInsertId,
  });

  Object.assign(client, {
    results: executor.results,
    configure: configuration.configure,
    set(key, value) {
      const parameters = configuration.set(key, value);

      // Pooled connections were opened with the old settings; reopen them lazily.
      if (key === 'pool' || key === 'connectionLimit' || connectionKeys.includes(key)) {
        executor.resetPool();
      }

      return parameters;
    },
    get: configuration.get,
    changeUser(connection, values, callback) {
      connection.changeUser(values, callback);
    },
    run: executor.run,
    runEscape: executor.runEscape,
    runAsync: executor.runAsync,
    runEscapeAsync: executor.runEscapeAsync,
    transaction: executor.transaction,
    end: executor.end,
    endAsync: executor.endAsync,
    list: output.list,
    toXML: xml.toXML,
    toXMLAsync: xml.toXMLAsync,
  });

  return client;
}

const defaultClient = createClient();

defaultClient.createClient = createClient;

module.exports = defaultClient;
