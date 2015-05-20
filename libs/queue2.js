"use strict";
var gu = require('geoutils');
var _ = require('underscore');
var zmq = require('zmq');
var datalayer;
var msgid=1;
var requester = zmq.socket('req');
requester.connect("ipc://taxiserver");



/**
 * Creates a queue for users. The queue is stored in memory and in a database.
 * @param {object} dblayer MariaDB connexion object
 */
function QueueMain(dblayer) {
	datalayer=dblayer;
	return exports;
}
module.exports = QueueMain;


/**
 * Makes a query to the queue
 * @param  {string}   queryName  Name of the function to query
 * @param  {array}   parameters Array containing the parameters for the function in the exact order
 * @param  {Function} cb         Callback function
 */
function queryQueue(queryName,parameters,cb) {
	var myMsgID=msgid;
	msgid++;

	requester.on("message", function(reply) {
		var result={};
		var response=JSON.parse(reply.toString());
		console.log("Response for ",myMsgID,": ",response);
		if (response.Id!==myMsgID)
			return;

		result.State=response.State;
		if (result.State==="True") {
			result.Content=response.Content;
		}
		else {
			result.Error=response.Error;
		}
		cb(true,result);
	});

	var request=JSON.stringify({Function:queryName,Arguments:parameters,Id:myMsgID});
	console.log("Request ",myMsgID,": ",request);
	requester.send(request);

}



/**
 * Checks if the user is on the queue
 * @param  {string}  userid The user id
 * @return {Boolean} Trueif it is, false if not
 */
function isUserOnQueue(userid,cb) {
	queryQueue("isUserOnQueue",[userid],cb);
}


/**
 * Checks if the queue is empty
 * @return {Boolean} True if it is, false if not
 */
function isQueueEmpty(cb) {
	queryQueue("isQueueEmpty",[],cb)
}

/**
 * Gets the position of an user on queue
 * @param  {string} userid The user id
 * @return {integer} if the user is found, the position starting on 0. If not, it returns -1
 */
function getPositionOfUser(userid) {
	for (var i=0;i<queue.length;i++) {
		if ( userid === _.propertyOf(queue[i])('userid') ) {
			return i;
		}
	}
	return -1;
}


/**
 * Gets the position of an user on queue
 * @param  {string} userid The user id
 * @param {Function} cb     The callback function (if the user is found, the position starting on 1. If not, it returns -1)
 */
exports.getPositionOfUser=function(userid,cb) {
	var result=getPositionOfUser(userid);
	if (result!==-1) {
		cb(true,result+1);
	}
	else {
		cb(false,result);
	}
}


/**
 * Adds an user to the queue
 * @param {string}   userid The user id
 * @param {double}   lat    The latitude coordinate of the user
 * @param {double}   long   The longitude coordinate of the user
 * @param {Function} cb     The callback function
 */
exports.addToQueue = function(userid,lat,long,cb) {
	var newUser;
	function addToQueueDB(result,content) {
		if (result) {
			queue.push(newUser);
			return cb(true,"The user "+userid+" has beed added to the queue");
		}
		else {
			return cb(false,content);
		}
	}

	if (!isUserOnQueue(userid)) {
		var userlocation=new gu.LatLon(lat,long);
		newUser=new queueUser(userid,userlocation);
		datalayer.addUserToQueue(newUser,addToQueueDB);
	}
	else {
		return cb(false,"The user "+userid+" is already on queue");	
	}
}

/**
 * Takes an user from the queue
 * @param {string}   userid The user id
 * @param {Function} cb     The callback function
 */
exports.takeUserFromQueue = function(userid,cb) {
	function takeUserFromQueueDB(result,content) {
		if (result) {
			queue.splice(position,1);
			return cb(true,"The user "+userid+" has been removed from queue");
		}
		else {
			return cb(false,content);
		}
	}

	var position=getPositionOfUser(userid);
	if (position!==-1) {
		datalayer.takeUserFromQueue(userid,takeUserFromQueueDB);
	}
	else {
		cb(false,"The user "+userid+" is not on queue");
	}
}

/**
 * Takes the first user from the queue and sends it back
 * @param {Function} cb     The callback function
 */
exports.takeNextUserFromQueue = function(cb) {
	var nextUser;
	var response={};
	function takeNextUserFromQueueDB(result,content) {
		if (result) {
			response.userid=nextUser.userid;
			response.lat=nextUser.location.lat();
			response.long=nextUser.location.lon();
			return cb(true,response);
		}
		else {
			//Put it at the end
			queue.push(nextUser);
			return cb(false,content);
		}
	}
	
	if (!isQueueEmpty()) {
		nextUser=queue.shift();
		datalayer.takeUserFromQueue(nextUser.userid,takeNextUserFromQueueDB);
		
	}
	else {
		cb(false,"There is no users on queue");
	}
};


/**
 * Gets the content of the queue
 * @param {Function} cb     The callback function
 */
exports.getQueueContent = function(cb) {
	if (!isQueueEmpty()) {
		var response=[];
		for (var i=0;i<queue.length;i++) {
			var currentUser=queue[i];
			var responseUser={};
			responseUser.userid=currentUser.userid;
			responseUser.latitude=currentUser.location.lat();
			responseUser.longitude=currentUser.location.lon();
			responseUser.position=i+1;
			response.push(responseUser)
		}
		cb(true,response);
	}
	else {
		cb(false,"There is no users on queue");
	}	
}


/**
 * Gets the location on an user
 * @param  {string}   userid The user id
 * @param {Function} cb     The callback function
 */
exports.getUserLocation = function(userid,cb) {
	if (isUserOnQueue(userid)) {
		for (var i=0;i<queue.length;i++) {
			if (queue[i].userid===userid) {
				var currentUser=queue[i];
				var response={};
				response.latitude=currentUser.location.lat();
				response.longitude=currentUser.location.lon();
				cb(true,response);
				break;
			}
		}
	}
	else {
		cb(false,'The user is not on queue');
	}
}


/**
 * Updates the user location
 * @param  {string}   userid The user id
 * @param  {string}   lat    The new latitude coordenates
 * @param  {string}   long   The new longitude coordenates
 * @param {Function} cb     The callback function
 */
exports.updateDriverLocation = function(userid,lat,long,cb) {
	var userUpdatedPosition;
	var userUpdated;

	function updateDriverLocationDB(result,content) {
		if (result) {
			queue[userUpdatedPosition]=userUpdated;
			cb(true,'The user '+userid+' location has been updated');
		}
		else {
			cb(false,content);
		}
	}

	if (isUserOnQueue(userid)) {
		for (var i=0;i<queue.length;i++) {
			if (queue[i].userid===userid) {
				userUpdatedPosition=i;
				userUpdated=JSON.parse( JSON.stringify( queue[i] ) );;
				userUpdated.location=new gu.LatLon(lat,long);
				userUpdated.lastUpdate=new Date();
				datalayer.updateUserFromQueue(userUpdated,updateDriverLocationDB);
				break;
			}
		}
	}
	else {
		cb(false,'The user is not on queue');
	}
}

/**
 * Gets the last time that the user was updated
 * @param  {string}   userid The user id
 * @param {Function} cb     The callback function
 */
exports.getUserLastUpdate = function(userid,cb) {
	var userposition=getPositionOfUser(userid);
	if (userposition!==-1) {
		cb(true,queue[userposition].lastUpdate);
	}
	else {
		cb(false,'The user is not on queue');
	}
}

/**
 * Gets all the update times from the users on the queue
 * @param {Function} cb     The callback function
 */
exports.getAllLastUpdates = function(cb) {
	var result=[];
	for (var i=0;i<queue.length;i++) {
		var currentUser=queue[i];
		result.push({userid:currentUser.userid,lastUpdate:currentUser.lastUpdate});
	}
	cb(true,result);
}