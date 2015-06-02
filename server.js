"use strict";
/*Carga de los modulos necesarios*/
var restify = require("restify"); //restify module
var restifyOAuth2 = require("restify-oauth2"); //oauth2 module for restify
var fs = require('fs');
var nconf = require('nconf').file({ file: './config/config.json' }); //configuration modules
var log = require('./libs/log')(nconf.get("application:mode"),nconf.get("application:logfile")); //wrapper for the loggin module winston
var dbclient = require('./libs/dbconnect')(nconf,log); //wrapper for the mariadb module that connect to db by itself
var datalayer = require('./libs/datalayer')(dbclient);
var hooks=require('./libs/hooks')(datalayer,log); //hooks modules for Oauth2 
var queue=require('./libs/queue2')(datalayer,nconf); //The queue module
var cleanqueue=require('./libs/cleanqueue')(queue,log);
var apihandler = require('./libs/apihandler')(nconf,datalayer,log,queue); //The api handlers module
var apiroutes=require('./libs/apiroutes')(apihandler); //The api routes module
var secretauth=require('./libs/secretauth') //The restify module for messages encryption
var connfilter=require('./libs/connfilter'); //The restify module for connection filtering

var server = restify.createServer({ 
	name: nconf.get("application:name"),
	version: nconf.get("application:version"),
	key: fs.readFileSync(nconf.get("server:sslkey")),
	certificate: fs.readFileSync(nconf.get("server:sslcertificate"))
});


require('./libs/failover')(datalayer,log); //Iniciates the failover process
require('./libs/shutdown')(server,dbclient,datalayer,log);; //prepares the shutdown process

server.use(connfilter(dbclient));
server.use(restify.bodyParser({ mapParams: false }));
server.use(secretauth(datalayer));
server.use(restify.authorizationParser());

restifyOAuth2.ropc(server, { tokenEndpoint: "/token/:userid", hooks: hooks });

//Sets the server to listen on the routes indicated in apiroutes
server=require('./libs/serversetup')(server,apiroutes);

server.listen(nconf.get("server:port"), function() {
  log.log("info",'%s listening at %s', server.name, server.url);
});







