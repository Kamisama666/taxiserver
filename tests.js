"use strict";
/*Carga de los modulos necesarios*/
var restify = require("restify"); //restify module
var restifyOAuth2 = require("restify-oauth2"); //oauth2 module for restify
var fs = require('fs');
var nconf = require('nconf').file({ file: './config/config.json' }); //configuration modules
var log = require('./libs/log')(nconf.get("application:mode"),nconf.get("application:logfile")); //wrapper for the loggin module winston
var dbclient = require('./libs/dbconnect')(nconf,log); //wrapper for the mariadb module that connect to db by itself
var datalayer = require('./libs/datalayer')(dbclient);
var hooks = require('./libs/hooks')(datalayer,log); //hooks modules for Oauth2
var queue = require('./libs/queue2')(datalayer,nconf); //The queue module
var cleanqueue = require('./libs/cleanqueue')(queue,log);
var apihandler = require('./libs/apihandler')(nconf,datalayer,log,queue); //The api handlers module
var apiroutes = require('./libs/apiroutes')(apihandler); //The api routes module
var secretauth = require('./libs/secretauth') //The restify module for messages encryption
var connfilter = require('./libs/connfilter'); //The restify module for connection filtering

var inspect = require('util').inspect;
var localizations=require('./libs/localizations')(datalayer);
var queue=require('./libs/queue');
var datacrypt = require('./libs/datacrypt')(datalayer);
var gu = require('geoutils');

var cb=function(resultado1,resultado2){console.log("Resultado("+resultado1+"): "+inspect(resultado2));};

/*function plugin1() {
	function insidePlugin1(req, res, next){
		console.log(req);
		next();
	}
	return insidePlugin1;
}*/


function User(userid,location) {
	this.userid=userid;
	this.location=location;
	this.lastUpdate=new Date();
}
var usuario=new User('1',new gu.LatLon(10.20,50.15));

//Datalayer test

/*datalayer.getUserById(1,cb);
datalayer.getAllTokens(cb);
datalayer.getToken('asdfghjkl',cb);
datalayer.setTokenScope('asdfghjkl','DRIVER',cb);
datalayer.deleteToken('qwertyuiop',cb);
datalayer.createTokenForUser(1,'qwertyuiop',cb);
datalayer.getTokensOfUser(1,cb);
datalayer.getTokenById(13,cb)
datalayer.getUsersByType("DRIVER",cb);
datalayer.getAllLocalizations(cb);
datalayer.getAllSecrets(cb);
datalayer.getLocalizationById('1',cb);
datalayer.addUserToQueue(usuario,cb);
datalayer.takeUserFromQueue('1',cb);
datalayer.emptyQueue(cb);
datalayer.getUserExtensionById('1',cb);
*/


/*//Hooks tests
var credentials={userid:'1',clientSecret:'123456789',token:'asdfghjkl',username:'user1',password:'1234'};
var req={params:{userid:'1'}};
hooks.validateClient(credentials, req, cb);
hooks.authenticateToken('asdfghjkl', req, cb);
hooks.grantUserToken(credentials, req, cb);
hooks.grantScopes(credentials,'DRIVER', req, cb);*/



/*function respond1(req, res, next) {
	console.log(req.scopesGranted);
	if (!req.username) {
    	return res.sendUnauthenticated();
    }

	res.send('hello ' + req.params.userid);
	next();
}
function respond2(req,res,next) {
	res.send('hello ' + req.params.userid);
	next();
}
*/

var server = restify.createServer({ 
	name: nconf.get("application:name"),
	version: nconf.get("application:version"),
	key: fs.readFileSync(nconf.get("server:sslkey")),
	certificate: fs.readFileSync(nconf.get("server:sslcertificate")),
});

require('./libs/failover')(datalayer,log);
require('./libs/shutdown')(server,dbclient,datalayer,log);

server.use(connfilter(dbclient));
server.use(restify.bodyParser({ mapParams: false }));
server.use(secretauth(datalayer));
server.use(restify.authorizationParser());

restifyOAuth2.ropc(server, { tokenEndpoint: "/token/:userid", hooks: hooks });


server=require('./libs/serversetup')(server,apiroutes);


/*server.listen(nconf.get("server:port"), function() {
  log.log("info",'%s listening at %s', server.name, server.url);
});
*/
server.listen(nconf.get("server:port"), function() {
	log.log("info",'%s listening at %s', server.name, server.url);
});



/*console.log(apiroutes);
console.log(apiroutes[0]);
console.log(apiroutes[0]['ruta0']);
console.log(apiroutes[0]['ruta0']['path']);*/


/*var req={path:'/api'};
var res={send:function(algo){console.log(algo);}};
function next() {
	console.log("Done");
}
var myfunc=apiroutes[0]['function'];
myfunc(req, res, next);*/

/*
queue.addToQueue(1,10.1232,50.1234,cb);
queue.addToQueue(2,10.1232,50.1234,cb);
queue.addToQueue(1,10.1232,50.1234,cb);
queue.takeUserFromQueue(2,cb);
queue.takeUserFromQueue(2,cb);
queue.addToQueue(2,10.1232,50.1234,cb);
queue.takeLastUserFromQueue(cb);
queue.addToQueue(1,10.1232,50.1234,cb);
queue.addToQueue(3,10.1232,50.1234,cb);
queue.getQueueContent(cb);
queue.getUserLastUpdate(1,cb);
queue.getAllLastUpdates(cb);
*/

/*var localizations=require("./libs/localizations")(datalayer);
localizations.isInside(51.5125,7.485);
localizations.isInside(51.5125,50.4);
localizations.isInsideLocalization('1',{latitude:'51.5125',longitude:'7.485'},cb)*/

//datacrypt.decryptForUser('1',{"hola":"hola"},cb);