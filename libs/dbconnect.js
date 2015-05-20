"use strict";
var DB = require('mariasql'); //modulo para conectar con MariaDB

/**
 * // Connect with the database with the configuration parameters
 * @param  {nconf object} nconf Configuration module
 * @param  {log object} log   Logging module
 * @return {mariasql object}       The client to the database
 */
module.exports = function(nconf,log) {
	var dbclient=new DB();

	log.log("info","%s v.%s starting...",nconf.get("application:name"),nconf.get("application:version"));
	log.log("info","Database on %s:%s",nconf.get("database:host"),nconf.get("database:port"));
	log.info("Connecting to the database...");

	dbclient.on('connect', function() {
				log.info("Connected to the database");
			})
			.on('error', function(err) {
				log.info('DB Client error: ' + err);
			})
			.on('close', function(hadError) {
				log.info('DB Client closed');
			});

	dbclient.connect({
		host: nconf.get("database:host"),
		port:nconf.get("database:port"),
		user: nconf.get("database:usuario"),
		password: nconf.get("database:password"),
		db:nconf.get("database:name")
	});

	return dbclient;

}