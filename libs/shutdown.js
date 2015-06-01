"use strict";
var dbclient;
var server;
var datalayer;
var log;
var Sync = require('sync');

function shutdown(resServer, clientdb, dblayer, logging) {
	server=resServer;
	dbclient=clientdb;
	log=logging;
	datalayer=dblayer;
	log.info("Shutdown listening");

	//so the program will not close instantly
	process.stdin.resume();

	/*//do something when app is closing
	process.on('exit', exitHandler);*/

	//catches ctrl+c event
	process.on('SIGINT', exitHandler);
}

module.exports = shutdown;

function closeServer(cb) {
	server.close()
	setTimeout(function(){
		cb(null,null);	
	},1000)
	
	server.on('close',function(info) {
				log.info("restify server closed");
			});
}

function closeDB(cb) {
	if (dbclient.connected) {
		dbclient.end();
		setTimeout(function(){
			cb(null,null);	
		},1000)
	}
	else {
		cb(null,null);
	}
	dbclient.on('close',function(info) {
				log.info("Server closed");
			});
}

function clearQueue(cb) {
	if (dbclient.connected) {
		datalayer.emptyQueue(function(result,content){
			log.info("Queue cleaned")
		});
		setTimeout(function(){
			cb(null,null);	
		},1000)
		
	}
	else {
		cb(null,null);
	}
	
		

}


function exitHandler(code) {
	Sync(function(){
		try {
			log.info("Shuting down process started");
			clearQueue.sync(null);
			closeDB.sync(null);
			closeServer.sync(null);
			process.exit();
		}
		catch(error) {
			log.warn("Server closed with errors: "+error);
			process.exit();
		}

	})
}
