'use strict';

const configuration = require('./configuration');
const executor = require('./query-executor');
const output = require('./output');
const xml = require('./xml');

Object.defineProperty(exports, 'lastInsertId', {
  enumerable: true,
  get: executor.lastInsertId,
  set: executor.setLastInsertId,
});
exports.results = executor.results;
exports.configure = configuration.configure;
exports.set = configuration.set;
exports.get = configuration.get;

exports.changeUser = function changeUser(connection, values, callback) {
  connection.changeUser(values, callback);
};

exports.run = executor.run;
exports.runEscape = executor.runEscape;
exports.runAsync = executor.runAsync;
exports.runEscapeAsync = executor.runEscapeAsync;
exports.list = output.list;
exports.toXML = xml.toXML;
exports.toXMLAsync = xml.toXMLAsync;
