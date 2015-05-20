"use strict";
var dbclient;
var server;
var datalayer;
var log;
var Sync = require('sync');

function shutdown(resServer,clientdb,dblayer,logging) {
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
	server.on('close',function(info) {
				log.info("restify server closed");
				cb(null,null);
			});
}

function closeDB(cb) {
	dbclient.end();
	dbclient.on('close',function(info) {
				log.info("Server closed");
				cb(null,null);
			});
}

function clearQueue(cb) {
	datalayer.emptyQueue(function(result,content){
		log.info("Queue cleaned")
		cb(null,null);
	});
}


function exitHandler(code) {
	Sync(function(){
		try {
			log.info("Shuting down process started");
			closeServer.sync(null);
			clearQueue.sync(null);
			closeDB.sync(null);
			process.exit();
		}
		catch(error) {
			log.warn("Server closed with errors: "+error);
			process.exit();
		}

	})
}
