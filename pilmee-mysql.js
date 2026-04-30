
/* 
 *     PILMEE GATES --- MYSQL GESTOR 2013
 *		requerimiento modulo mysql
 */

var mysql    = require('mysql')
  , util     = require('util')
  , colors   = require('colors')
  , xml = require('xml-mapping');

/*
 *  PARAMETROS DE CONEXION
 */ 

var parameters = { 
	host     : ''
  , user     : ''
  , password : ''
  , database : ''
  , port     : 3306
  , debug    : false
  , debugSQL : false
  , format   : 'json'
  , insecureAuth : false
  , supportBigNumbers : false
  , bigNumberStrings : false
  , timezone : 'local'
};

/*
 *  CONFIGURACIONES
 */

var counter = 0
  , sqlResults = 0;

var connection = function(){
	counter++;
	return mysql.createConnection({ host: parameters.host, user: parameters.user , password : parameters.password, database : parameters.database, port : parameters.port, debug : parameters.debug, insecureAuth: parameters.insecureAuth, supportBigNumbers: parameters.supportBigNumbers, bigNumberStrings: parameters.bigNumberStrings, timezone: parameters.timezone });
};

var config = function(cnx){
	cnx.config.queryFormat = function (query, values) {
	if (!values) return query;
		return query.replace(/\:(\w+)/g, function (txt, key) {
    		if (values.hasOwnProperty(key)) {
      			return this.escape(values[key]);
    		}
    	return txt;
  		}.bind(this));
	};
};

var messageConnect = function(){
	util.log('Connection established  ['.yellow+' #'+counter+' ]'.yellow);
};

var messageDisconnect = function(){
	util.log('Connection closed'.yellow);
}

var logSQL = function(sql){
	console.log('\n │ \n │ SQL DEBUG\n │ \n │→ ' + sql + '\n │ \n | --- end ---\n │\n');
	return;
};

var legend = function(){
	console.log('┌───────────────────────────────────────────────┐'.bold.cyan);
	console.log('│    LIBRARY TO MANAGE MYSQL (pilmee-mysql)     │'.bold.cyan);
	console.log('│ ☺ Create by PiLMee Gates → @pilmee            │'.bold.cyan);
	console.log('│ Emails: pilmee@gmail.com, pilmee@eticagnu.org │'.bold.cyan);
	console.log('└───────────────────────────────────────────────┘\n'.bold.cyan);
};

exports.lastInsertId = null;
exports.results = function(){
	return sqlResults;
};

exports.configure = function(callback){
	callback();
};

exports.set = function(key, value){
	parameters[key] = value;
	return parameters;
};

exports.get = function(key){
	return parameters[key];
};

exports.changeUser = function(cnx, values, callback){
	cnx.changeUser(values, callback);
	return;
};

exports.run = function(sql, callback){
	var cnx = new connection;
	config(cnx);
	cnx.connect(messageConnect);	
	cnx.query(sql, function(err, result, headers){
		sqlResults = result.length;
		callback(err, result, headers);
	});
	if(parameters.debugSQL) logSQL(sql);
	cnx.end(messageDisconnect);
};

exports.runEscape = function(sql, values, callback){
	var cnx = new connection;
	config(cnx);
	cnx.connect(messageConnect);	
	cnx.query(sql, cnx.escape(values),  function(err, result, headers){
		sqlResults = result.length;
		callback(err, result, headers);
	});
	if(parameters.debugSQL) logSQL(sql);
	cnx.end(messageDisconnect);
};

exports.list = function(result, keyName, displayName, callback){
	console.log('\n─────────────────────────────────────────────────\nSQL Data List\n─────────────────────────────────────────────────\n'.bold.green);
	console.log('  #\tKEY\tDISPLAY NAME'.bold.magenta);
	var pos = 1;
	for(var element in result){
		console.log('→ ' + pos + '.\t' + result[element][keyName] + '\t' +result[element][displayName]);
		pos++;
	}
	callback();
	console.log('─────────────────────────────────────────────────'.bold.green);
};

exports.toXML = function(json, callback){
	var result = xml.dump(json);
	callback("<?xml version='1.0' encoding='ISO-8859-1'?>\n" + result);
};

legend();
