'use strict';

const { createConfiguration } = require('./configuration');
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
    set: configuration.set,
    get: configuration.get,
    changeUser(connection, values, callback) {
      connection.changeUser(values, callback);
    },
    run: executor.run,
    runEscape: executor.runEscape,
    runAsync: executor.runAsync,
    runEscapeAsync: executor.runEscapeAsync,
    list: output.list,
    toXML: xml.toXML,
    toXMLAsync: xml.toXMLAsync,
  });

  return client;
}

const defaultClient = createClient();

defaultClient.createClient = createClient;

module.exports = defaultClient;
