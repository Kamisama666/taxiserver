"use strict";
var datalayer;
var log;
var nconf;
var Sync = require('sync');
var zmq = require('zmq');
var requester = zmq.socket('req');
var ipcpath;

var queuetable_userid='userid';
var queuetable_latitude='lat';
var queuetable_longitude='lng';
var queuetable_lastupdate='lastupdate';


function Failover(dblayer,logging,config) {
	datalayer=dblayer;
	log=logging;
	nconf=config;

	ipcpath=nconf.get("queue:ipcpath");

	//Normal shutdown
	process.on('SIGINT', function() {
		responder.close();
	});

	//In case of an error
	process.on('uncaughtException', function (err) {
		responder.close();
	});

	Sync(function(){
		queryDbQueue.sync(null);
	});
}

module.exports=Failover;


function queryDbQueue(cb) {
	datalayer.getUsersFromQueue(FailoverDB);

	function FailoverDB(result,content) {
		if (!result) {
			log.log('error','Error on the failover process with the DB: '+content);
			return cb(null,null);
		}
		if (content.length<1) {
			log.log('info','Failover process does not detect problems. Failover check finalished.');
			return cb(null,null);
		}
		
		log.warn("Failover process has detected problems. It's going to try to fix them.");
		requester.connect(ipcpath);
		var userList=[];

		for (var i in content) {
			var user=content[i];
			userList.push({
				userid:user[queuetable_userid],
				lat:user[queuetable_latitude],
				long:user[queuetable_longitude]
			})
		}
		
		queryQueue('addListToQueue',[userList],failoverQuery);
	}

	function failoverQuery(result,content) {
		if (content.State) {
			log.log('info','Failover process finished.');
			return cb(null,null);
		}

		log.log('error','Errors on the failover process with the queue: '+content.Error);
		return cb(null,null);
	}
}


/**
 * Makes a query to the queue
 * @param  {string}   queryName  Name of the function to query
 * @param  {array}   parameters Array containing the parameters for the function in the exact order
 * @param  {Function} cb         Callback function
 */
function queryQueue(queryName,parameters,cb) {
	var myMsgID=1;

	requester.on("message", function(reply) {
		var result={};
		var response=JSON.parse(reply.toString());
		if (response.ID!==myMsgID)
			return;

		result.State=response.State;
		if (result.State) {
			result.Content=response.Content;
		}
		else {
			result.Error=response.Error;
		}
		cb(true,result);
	});

	var request=JSON.stringify({Function:queryName,Arguments:parameters,ID:myMsgID});
	requester.send(request);

}