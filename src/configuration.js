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
  pool: false,
  connectionLimit: 10,
};
const connectionKeys = [
  'host',
  'user',
  'password',
  'database',
  'port',
  'debug',
  'insecureAuth',
  'supportBigNumbers',
  'bigNumberStrings',
  'timezone',
];

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
      return Object.fromEntries(connectionKeys.map((key) => [key, parameters[key]]));
    },
    poolOptions() {
      return {
        ...this.connectionOptions(),
        connectionLimit: parameters.connectionLimit,
      };
    },
  };
}

module.exports = { createConfiguration, connectionKeys };
