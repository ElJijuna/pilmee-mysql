'use strict';

const parameters = {
  host: '',
  user: '',
  password: '',
  database: '',
  port: 3306,
  debug: false,
  debugSQL: false,
  format: 'json',
  insecureAuth: false,
  supportBigNumbers: false,
  bigNumberStrings: false,
  timezone: 'local',
};

exports.configure = function configure(callback) {
  callback();
};

exports.set = function set(key, value) {
  parameters[key] = value;

  return parameters;
};

exports.get = function get(key) {
  return parameters[key];
};

exports.connectionOptions = function connectionOptions() {
  return {
    host: parameters.host,
    user: parameters.user,
    password: parameters.password,
    database: parameters.database,
    port: parameters.port,
    debug: parameters.debug,
    insecureAuth: parameters.insecureAuth,
    supportBigNumbers: parameters.supportBigNumbers,
    bigNumberStrings: parameters.bigNumberStrings,
    timezone: parameters.timezone,
  };
};
