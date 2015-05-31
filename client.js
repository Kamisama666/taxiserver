"use strict";
var restify = require('restify');
var util = require('util')
var nconf = require('nconf').file({ file: './config/config.json' }); //configuration modules
var log = require('./libs/log')(nconf.get("application:mode"),"logs/client.log"); //wrapper for the loggin module winston
var dbclient = require('./libs/dbconnect')(nconf,log); //wrapper for the mariadb module that connect to db by itself
var datalayer = require('./libs/datalayer')(dbclient);
var datacrypt = require('./libs/datacrypt')(datalayer);
var _ = require('underscore');
var util = require('util');

var token='Bearer AARtXcVZUg/X2l8iPOC0EJXg6B/mB9ZlWPDrB2rAbyQ=';
var encryptedToken='3c9c19b8014a450e58f725141d64f18942fd281cf0bc9f5afbf74b2d37c5d14492e120122f9d2b336ea4f4c24983afcb4c50aa';

var commToken='Bearer QAPRjCc7zRigS4CLUUJBDjy34w5HGY36aYrvzgY41dQ=';
var commEncryptedToken='1dda8900a1f36a18756a49756c7c46c425852a1d9f9c9ff73e972dd1117ef2597fecc87214ff285200c3ab59c0e48eb654fab0';


var tokenClient = restify.createJsonClient({
	url: 'https://localhost:1337',
	version: '*',
	rejectUnauthorized: false, //since we are using a self signed certificate
	headers:{ 
		'user-agent': 'clientify/1.0.0',
		host: 'localhost:1337',
	    accept: '*',
	    authorization: encryptedToken
	}
});


var tokenClient2 = restify.createJsonClient({
	url: 'https://localhost:1337',
	version: '*',
	rejectUnauthorized: false,
	headers:{ 
		'user-agent': 'clientify/1.0.0',
		host: 'localhost:1337',
	    accept: '*/*',
	    authorization: commEncryptedToken
	}
});

function modHeaders(req) {
	function modAuthHeader(result,content) {
		if (result) {
			req.setHeader("authorization",content.secret);
			return;
		}
	}

	datacrypt.encryptForUser('1',req._headers.authorization,modAuthHeader)
	
	
}

function modHeaders2(req) {
	function modAuthHeader(result,content) {
		if (result) {
			req.setHeader("authorization",content.secret);
			return;
		}
	}

	datacrypt.encryptForUser('3',req._headers.authorization,modAuthHeader)
	
	
}

var authClient = restify.createJsonClient({
	url: 'https://localhost:1337',
	version: '*',
	rejectUnauthorized: false,
	headers:{ 
		'user-agent': 'clientify/1.0.0',
		host: 'localhost:1337',
	    accept: '*/*'
	},
	signRequest:modHeaders
});

authClient.basicAuth('user1', '1234');

var authClient2 = restify.createJsonClient({
	url: 'https://localhost:1337',
	version: '*',
	rejectUnauthorized: false,
	headers:{ 
		'user-agent': 'clientify/1.0.0',
		host: 'localhost:1337',
	    accept: '*/*'
	},
	signRequest:modHeaders2
});

authClient2.basicAuth('comm1', '1234');

function processResponse(err, req, res, obj) {
	if (_.has(obj,'State')) { 
		//It's a standard error
		if (obj.State==='True') {
			datacrypt.decryptForUser('1',obj.Content,function(result,content){
				console.log(content.secret);
			})
		}
		else {
			console.log(obj.Error);	
		}
	}
	else if (typeof obj !== "undefined") {
		if (_.has(obj,'code')) {
			console.log(obj.code);
			console.log(obj.message);
		}
		else {
			console.log(obj);
		}
	}
	else {
		console.log(err);
	}
}

function processResponse2(err, req, res, obj) {
	if (_.has(obj,'State')) { 
		//It's a standard error
		if (obj.State==='True') {
			datacrypt.decryptForUser('3',obj.Content,function(result,content){
				console.log(content.secret);
			})
		}
		else {
			console.log(obj.Error);	
		}
	}
	else if (typeof obj !== "undefined") {
		if (_.has(obj,'code')) {
			console.log(obj.code);
			console.log(obj.message);
		}
		else {
			console.log(obj);
		}
	}
	else {
		console.log("Hola");
		console.log(err);
	}
}

function sendMessage1(result,content) {
	if (result) {
		tokenClient.post('/api/1.0.0/1/queue',{encryptedBody:content.secret},processResponse);
	}
}

function sendMessage2(result,content) {
	if (result) {
		authClient.post('/token/1',{encryptedBody:content.secret},processResponse);
	}
}

function sendMessage3(result,content) {
	if (result) {
		tokenClient.put('/api/1.0.0/1/queue/1/location',{encryptedBody:content.secret},processResponse);
	}
}

function sendMessage4(result,content) {
	if (result) {
		authClient2.post('/token/3',{encryptedBody:content.secret},processResponse);
	}
}

function sendMessage5(result,content) {
	if (result) {
		tokenClient.post('/api/1.0.0/1/localizations',{encryptedBody:content.secret},processResponse);
	}
}

function sendMessage6(result,content) {
	if (result) {
		tokenClient.post('/api/1.0.0/1/localizations/1',{encryptedBody:content.secret},processResponse);
	}
}

//datacrypt.encryptForUser('1','{"latitude":"51.5125","longitude":"7.485"}',sendMessage1);
//datacrypt.encryptForUser('1','{"grant_type":"password","scope":"DRIVER","username":"user1","password":"1234"}',sendMessage2);

//tokenClient.get('/api/1',processResponse);
//tokenClient.get('/api/1.0.0/1/users/drivers',processResponse);
//tokenClient.get('/api/1.0.0/1/users/drivers/2',processResponse);
tokenClient.get('/api/1.0.0/1/queue',processResponse);
//tokenClient.post('/api/1.0.0/1/queue',{"latitude":"51.5125","longitude":"7.485"},processResponse);
//tokenClient.get('/api/1.0.0/1/queue/1',processResponse);
//tokenClient.del('/api/1.0.0/1/queue/1', processResponse);
//tokenClient.get('/api/1.0.0/1/queue/1/location',processResponse);
//datacrypt.encryptForUser('1','{"latitude":"51.5125","longitude":"7.484"}',sendMessage3);
//tokenClient2.get('/api/1.0.0/3/queue/next', processResponse2);
//tokenClient.get("/api/1.0.0/1/localizations",processResponse);
//datacrypt.encryptForUser('1','{"latitude":"51.5125","longitude":"7.484"}',sendMessage5);
//tokenClient.get('/api/1.0.0/1/localizations/1',processResponse);
//datacrypt.encryptForUser('1','{"latitude":"51.5125","longitude":"7.484"}',sendMessage6);

//datacrypt.encryptForUser('1',token,function(result,content){console.log(content)});
//datacrypt.encryptForUser('3','{"grant_type":"password","scope":"COMMSERVER","username":"comm1","password":"1234"}',sendMessage4);
/*datacrypt.encryptForUser('3',commToken,function(result,content){
	console.log(content);
});*/