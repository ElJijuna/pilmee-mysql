'use strict';

var xml = require('xml-mapping');

exports.toXML = function toXML(json, callback) {
  callback("<?xml version='1.0' encoding='ISO-8859-1'?>\n" + xml.dump(json));
};
