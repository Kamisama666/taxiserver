var zmq = require('zmq');
var nconf = require('nconf').file({ file: '../config.json' }); //configuration modules
var log = require('./log')(nconf.get("application:mode"),"../"+nconf.get("application:logfile")); //wrapper for the loggin module winston
var dbclient = require('./dbconnect')(nconf,log); //wrapper for the mariadb module that connect to db by itself
var datalayer = require('./datalayer')(dbclient);
var queue=require('./queue2')(datalayer);

function cb(result,content) {
	console.log("(",result,"): ",content);
}


//queue.addToQueue('1',20.12,34.80,cb);
//queue.takeUserFromQueue('1',cb);
//queue.takeNextUserFromQueue(cb);
//queue.getQueueContent(cb);
//queue.getUserLocation('1',cb)
//queue.updateDriverLocation('1',10.13,14.89,cb);
//queue.getUserLastUpdate('1',cb);
queue.getAllLastUpdates(cb);