'use strict';

const defaults = {
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

function createConfiguration(initial = {}) {
  const parameters = { ...defaults, ...initial };

  return {
    configure(callback) {
      callback();
    },
    set(key, value) {
      parameters[key] = value;

      return parameters;
    },
    get(key) {
      return parameters[key];
    },
    connectionOptions() {
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
    },
  };
}

module.exports = { createConfiguration };
