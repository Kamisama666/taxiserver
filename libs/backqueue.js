"use strict";
var gu = require('geoutils');
var _ = require('underscore');
var nconf = require('nconf').file({ file: '../config/config.json' }); //configuration modules
var log = require('./log')(nconf.get("application:mode"),nconf.get("application:rootpath")+nconf.get("application:logfile")); //wrapper for the loggin module winston
var queueUser = require('./queueuser');
var zmq = require('zmq');
var queue=[];
var responder = zmq.socket('router');

log.info("Queue process iniciated");


//Connect the router to the queue
responder.bindSync(nconf.get("queue:ipcpath"));

//Normal shutdown
process.on('SIGINT', function() {
	log.info("Queue terminated normally.");
	responder.close();
});

//In case of an error
process.on('uncaughtException', function (err) {
	log.log('error','Queue terminated with errors: '+err);
	responder.close();
});


/**
 * Check if the object contains the prodived parameters
 * @param  {object} obj The object
 * @param  {array} requiredParam The required parameters
 * @return {Boolean}     True if it has them, false if not
 */
function objContains(obj,requiredParam) {
	var result=true;
	for (var i=0;i<requiredParam.length;i++) {
		if (!_.has(obj,requiredParam[i])) {
			result=false;
		}
	}
	return result;
}


/**
 * Checks if the user is on the queue (Internal)
 * @param  {string}  userid The user id
 * @return {Boolean} Trueif it is, false if not
 */
function isUserOnQueue(userid) {
	var isOnQueue=false;
	for (var i=0;i<queue.length;i++) {
		if ( userid === _.propertyOf(queue[i])('userid') ) {
			isOnQueue=true;
			break;
		}
	}
	return isOnQueue;
}



/**
 * Checks if the user is on the queue (External)
 * @param  {string}  userid The user id
 * @return {Boolean} Trueif it is, false if not
 */
function isUserOnQueueExternal(userid) {
	var isOnQueue=isUserOnQueue(userid);
	var result={};
	result.State="True";
	result.Content=isOnQueue;
	return result;
}


/**
 * Checks if the queue is empty
 * @return {Boolean} True if it is, false if not
 */
function isQueueEmpty() {
	return (queue.length>0)?false:true;
}

/**
 * Checks if the queue is empty
 * @return {Boolean} True if it is, false if not
 */
function isQueueEmptyExternal() {
	var result={State:"True"};
	result.Content=isQueueEmpty();
	return result;
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



function getPositionOfUserExternal(userid) {
	var result={State:"True"};
	var position=getPositionOfUser(userid);
	result.Content=(position!==-1)?position+1:-1;
	return result;
}



/**
 * Adds an user to the queue
 * @param {string}   userid The user id
 * @param {double}   lat    The latitude coordinate of the user
 * @param {double}   long   The longitude coordinate of the user
 */
function addToQueue(userid,lat,long,extension) {
	var newUser;

	if (!isUserOnQueue(userid)) {
		var userlocation=new gu.LatLon(lat,long);
		newUser=new queueUser(userid,userlocation,extension);
		queue.push(newUser);
		return {State:"True",Content:"User added to queue"};

	}
	else {
		return {State:"False",Error:"The user "+userid+" is already on queue"}
	}
}


/**
 * Adds a list of users to the queue. It's suppone to be user exclusively by the
 * failover module, so it doesn't follow the standard result pattern.
 * @param {array} listOfUsers An array containing the users. Format: [{userid,lat,long}, ...]
 */
function addListToQueue(listOfUsers) {
	var result={};
	var errors=[];
	var state=true;

	for (var i in listOfUsers) {
		var cUser=listOfUsers[i];
		if (!objContains(cUser,['userid','lat','long'])) {
			errors.push("The user has an invalid format");
			state=false;
			continue;
		}
		var addResult=addToQueue.apply(this,[cUser.userid,cUser.lat,cUser.long]);
		if (addResult.State!=="True") {
			errors.push(addResult.Error);
			state=false;
		}
	}
	result.State=state;
	if (state) {
		result.Content="Users added to queue";
	}
	else {
		result.Error=errors;
	}
	return result;

}


/**
 * Takes an user from the queue
 * @param {string}   userid The user id
 */
function takeUserFromQueue(userid) {

	var position=getPositionOfUser(userid);
	if (position!==-1) {
		queue.splice(position,1);
		return {State:"True",Content:"User taken from queue"};

	}
	else {
		return {State:"False",Error:"The user "+userid+" is not on queue"}
	}
}


/**
 * Takes the first user from the queue and sends it back
 */
function takeNextUserFromQueue() {
	if (!isQueueEmpty()) {
		var nextUser=queue.shift();
		var newUser={};
		newUser.userid=nextUser.userid;
		newUser.lat=nextUser.location.lat();
		newUser.lon=nextUser.location.lon();
		newUser.extension=nextUser.extension;
		return {State:"True",Content:newUser};
		
	}
	else {
		return {State:"False",Error:"There is no users on queue"}
	}
};


/**
 * Gets the content of the queue
 */
function getQueueContent() {
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
		return {State:"True",Content:response};
	}
	else {
		return {State:"False",Error:"There is no users on queue"}
	}
}


/**
 * Gets the location on an user
 * @param  {string}   userid The user id
 */
function getUserLocation(userid) {
	var userPosition=getPositionOfUser(userid);

	if (userPosition!==-1) {
		var currentUser=queue[userPosition];
		var response={};
		response.latitude=currentUser.location.lat();
		response.longitude=currentUser.location.lon();
		return {State:"True",Content:response};
	}
	else {
		return {State:"False",Error:"There is no users on queue"}
	}
}


/**
 * Updates the user location
 * @param  {string}   userid The user id
 * @param  {string}   lat    The new latitude coordenates
 * @param  {string}   long   The new longitude coordenates
 */
function updateDriverLocation(userid,lat,long) {
	var userPosition=getPositionOfUser(userid);

	if (userPosition===-1)
		return {State:"False",Error:"The user is not on queue"}

	queue[userPosition].location=new gu.LatLon(lat,long);
	queue[userPosition].lastUpdate=new Date();

	var userUpdated={};
	userUpdated.userid=userid;
	userUpdated.lat=queue[userPosition].location.lat();
	userUpdated.lon=queue[userPosition].location.lon();
	userUpdated.lastUpdate=queue[userPosition].lastUpdate.toString();

	return {State:"True",Content:userUpdated};
}


/**
 * Gets the last time that the user was updated
 * @param  {string}   userid The user id
 */
function getUserLastUpdate(userid) {
	var userposition=getPositionOfUser(userid);
	if (userposition!==-1) {
		return {State:"True",Content:queue[userposition].lastUpdate.toString()};
	}
	else {
		return {State:"False",Error:"The user is not on queue"}
	}
}


/**
 * Gets all the update times from the users on the queue
 */
function getAllLastUpdates() {
	var result=[];
	for (var i=0;i<queue.length;i++) {
		var currentUser=queue[i];
		result.push({userid:currentUser.userid,lastUpdate:currentUser.lastUpdate.toString()});
	}
	return {State:"True",Content:result};
}


/**
 * Routes the message to the requested function
 * @param  {array} jmessage The incoming message with the format: {Function:%function_name%,Arguments:[%parameter1,parameter2,...%],ID:%MSGID%}
 * @return {object}         The response emitted by the requested function
 */
function messageRouter(jmessage) {
	if (!_.has(jmessage,"Function") || !_.has(jmessage,"Arguments")) {
		return {State:"False",Error:"Invalid message format"};
	}

	var reqFunction=jmessage["Function"];
	var reqArguments=jmessage["Arguments"];
	var result;

	switch(reqFunction) {

		case "isUserOnQueue":
			result=isUserOnQueueExternal.apply(this,reqArguments);
			break;

		case "isQueueEmpty":
			result=isQueueEmptyExternal.apply(this,reqArguments);
			break;

		case "getPositionOfUser":
			result=getPositionOfUserExternal.apply(this,reqArguments);
			break;

		case "addToQueue":
			result=addToQueue.apply(this,reqArguments);
			break;

		case "addListToQueue":
			result=addListToQueue.apply(this,reqArguments);
			break;

		case "takeUserFromQueue":
			result=takeUserFromQueue.apply(this,reqArguments);
			break;

		case "takeNextUserFromQueue":
			result=takeNextUserFromQueue.apply(this,reqArguments);
			break;

		case "getQueueContent":
			result=getQueueContent.apply(this,reqArguments);
			break;

		case "getUserLocation":
			result=getUserLocation.apply(this,reqArguments);
			break;

		case "updateDriverLocation":
			result=updateDriverLocation.apply(this,reqArguments);
			break;

		case "getUserLastUpdate":
			result=getUserLastUpdate.apply(this,reqArguments);
			break;

		case "getAllLastUpdates":
			result=getAllLastUpdates.apply(this,reqArguments);
			break;

		default:
			result={State:"False",Error:"Invalid function name"};
	}
	result["ID"]=jmessage.ID;

	return result;
}

responder.on('message', function() {
		var identity = Array.prototype.slice.call(arguments)[0];
		var message= JSON.parse(arguments[2].toString());
		var response=JSON.stringify(messageRouter(message));

		//console.log("Sending response: "+response);
		responder.send([identity, '', response]);
	}
);





