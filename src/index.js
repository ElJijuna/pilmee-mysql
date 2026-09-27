'use strict';

var configuration = require('./configuration');
var executor = require('./query-executor');
var output = require('./output');
var xml = require('./xml');

exports.lastInsertId = null;
exports.results = executor.results;
exports.configure = configuration.configure;
exports.set = configuration.set;
exports.get = configuration.get;

exports.changeUser = function changeUser(connection, values, callback) {
  connection.changeUser(values, callback);
};

exports.run = executor.run;
exports.runEscape = executor.runEscape;
exports.list = output.list;
exports.toXML = xml.toXML;

output.legend();
