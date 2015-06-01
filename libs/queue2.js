"use strict";
var gu = require('geoutils');
var _ = require('underscore');
var zmq = require('zmq');
var datalayer;
var queueUser = require('./queueuser');
var msgid=1;
var requester = zmq.socket('req');




/**
 * Creates a queue for users. The queue is stored in memory and in a database.
 * @param {object} dblayer MariaDB connexion object
 */
function QueueMain(dblayer) {
	datalayer=dblayer;
	requester.connect("ipc:///tmp/taxiserver");
	return exports;
}
module.exports = QueueMain;



/**
 * The object for the user inside the queue
 * @param {string} userid   The user id
 * @param {object} location The location of the user (geoutil)
 
function queueUser(userid,location) {
	this.userid=userid;
	this.location=location;
	this.lastUpdate=new Date();
}*/


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
		if (response.ID!==myMsgID)
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

	var request=JSON.stringify({Function:queryName,Arguments:parameters,ID:myMsgID});
	requester.send(request);
}



/**
 * Checks if the user is on the queue
 * @param  {string}  userid The user id
 * @param  {Function} cb         Callback function
 */
function isUserOnQueue(userid,cb) {
	queryQueue("isUserOnQueue",[userid],cb);
}


/**
 * Checks if the queue is empty
 * @param  {Function} cb         Callback function
 */
function isQueueEmpty(cb) {
	queryQueue("isQueueEmpty",[],cb)
}

/**
 * Gets the position of an user on queue
 * @param  {string} userid The user id
 * @param  {Function} cb         Callback function
 */
function getPositionOfUser(userid,cb) {
	queryQueue("getPositionOfUser",[userid],cb)
}


/**
 * Gets the position of an user on queue
 * @param  {string} userid The user id
 * @param {Function} cb     The callback function (if the user is found, the position starting on 1. If not, it returns -1)
 */
exports.getPositionOfUser=getPositionOfUser;


/**
 * Adds an user to the queue
 * @param {string}   userid The user id
 * @param {double}   lat    The latitude coordinate of the user
 * @param {double}   long   The longitude coordinate of the user
 * @param {Function} cb     The callback function
 */
exports.addToQueue = function(userid,lat,long,cb) {
	var newUser;
	queryQueue("isUserOnQueue",[userid],isUserOnQueueQuery)

	function isUserOnQueueQuery(result,content) {
		if (content.Content) {
			return cb(false,"The user "+userid+" is already on queue");
		}
		datalayer.getUserById(userid,getUserDB);
		
	}

	function getUserDB(result,content) {
		if (!result)
			return cb(false,content);
		var userlocation=new gu.LatLon(lat,long);
		newUser=new queueUser(userid,userlocation,content.extension);
		datalayer.addUserToQueue(newUser,addToQueueDB);
	}


	function addToQueueDB(result,content) {
		if (!result)
			return cb(false,content);

		queryQueue("addToQueue",[userid,lat,long,newUser.extension],addToQueueQuery);
	}


	function addToQueueQuery(result,content) {
		if (!content.State==="True")
			return cb(false,content.Error);

		return cb(true,"The user "+userid+" has beed added to the queue");
	}
}


/**
 * Takes an user from the queue
 * @param {string}   userid The user id
 * @param {Function} cb     The callback function
 */
exports.takeUserFromQueue = function(userid,cb) {

	queryQueue('getPositionOfUser',[userid],getPositionOfUserQuery)


	function getPositionOfUserQuery(result,content) {
		var position=content.Content;
		if (position===-1)
			return cb(false,"The user "+userid+" is not on queue");

		datalayer.takeUserFromQueue(userid,takeUserFromQueueDB);
	}


	function takeUserFromQueueDB(result,content) {
		if (!result)
			return cb(false,content);
		
		queryQueue('takeUserFromQueue',[userid],takeUserFromQueueQuery)
		
	}


	function takeUserFromQueueQuery(result,content) {
		if (content.State!=="True");
			return cb(false,content.Error);

		return cb(true,"The user "+userid+" has been removed from queue");
	}
}

/**
 * Takes the first user from the queue and sends it back
 * @param {Function} cb     The callback function
 */
exports.takeNextUserFromQueue = function(cb) {
	var nextUser;
	var response={};

	queryQueue('isQueueEmpty',[],isQueueEmptyQuery);


	function isQueueEmptyQuery(result,content) {
		if (content.Content)
			return cb(false,"There is no users on queue");

		queryQueue('takeNextUserFromQueue',[],takeNextUserFromQueueQuery);
	}


	function takeNextUserFromQueueQuery(result,content) {
		if (content.State!=='True')
			return cb(false,content.Error);

		nextUser=content.Content;
		console.log(nextUser);
		datalayer.takeUserFromQueue(nextUser.userid,takeNextUserFromQueueDB);

	}


	function takeNextUserFromQueueDB(result,content) {
		if (result) {
			response.userid=nextUser.userid;
			response.lat=nextUser.lat;
			response.long=nextUser.lon;
			response.extension=nextUser.extension;
			console.log(response);
			return cb(true,response);
		}
		else {
			//Put it at the end
			queryQueue(
				"addToQueue",
				[
					nextUser.userid,
					nextUser.lat,
					nextUser.lon
				],
				addToQueueQuery);
		}
	}


	function addToQueueQuery(result,content) {
		if (!content.State==="True")
			return cb(false,content.Error);

		return cb(false,"The user "+userid+" couldn't be taken from the queue. It has been added again");
	}
	
};


/**
 * Gets the content of the queue
 * @param {Function} cb     The callback function
 */
exports.getQueueContent = function(cb) {

	queryQueue('isQueueEmpty',[],isQueueEmptyQuery);

	
	function isQueueEmptyQuery(result,content) {
		if (content.Content)
			return cb(false,"There is no users on queue");

		queryQueue('getQueueContent',[],getQueueContentQuery)

	}


	function getQueueContentQuery(result,content) {
		if (content.State!=='True')
			return cb(false,content.Error);

		cb(true,content.Content);
	}

}


/**
 * Gets the location on an user
 * @param  {string}   userid The user id
 * @param {Function} cb     The callback function
 */
exports.getUserLocation = function(userid,cb) {
	queryQueue('isUserOnQueue',[userid],isUserOnQueueQuery);

	function isUserOnQueueQuery(result,content) {
		if (!content.Content)
			return cb(false,'The user is not on queue');

		queryQueue('getUserLocation',[userid],getUserLocationQuery);	
	}


	function getUserLocationQuery(result,content) {
		if (content.State!=='True')
			return cb(false,content.Error);

		return cb(true, content.Content);
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

	queryQueue('isUserOnQueue',[userid],isUserOnQueueQuery);

	function isUserOnQueueQuery(result,content) {
		if (!content.Content)
			return cb(false,'There user is not on queue');

		queryQueue('updateDriverLocation',[userid,lat,long],updateDriverLocationQuery);
	}

	function updateDriverLocationQuery(result,content) {
		if (content.State!=='True')
			return cb(false,content.Error);

		userUpdatedPosition=new gu.LatLon(lat,long);
		userUpdated=new queueUser(userid,userUpdatedPosition);
		userUpdated.lastUpdate=new Date(content.Content.lastUpdate);
		datalayer.updateUserFromQueue(userUpdated,updateDriverLocationDB);
	}

	function updateDriverLocationDB(result,content) {
		if (!result)
			return cb(false,content);
		
		return cb(true,'The user '+userid+' location has been updated');
	}
}

/**
 * Gets the last time that the user was updated
 * @param  {string}   userid The user id
 * @param {Function} cb     The callback function
 */
exports.getUserLastUpdate = function(userid,cb) {
	queryQueue('getUserLastUpdate',[userid],getUserLastUpdateQuery);


	function getUserLastUpdateQuery(result,content) {
		if (content.State!=='True')
			return cb(false,content.Error);

		return cb(true,new Date(content.Content));
	}
}

/**
 * Gets all the update times from the users on the queue
 * @param {Function} cb     The callback function
 */
exports.getAllLastUpdates = function(cb) {
	queryQueue('getAllLastUpdates',[],getAllLastUpdatesQuery);


	function getAllLastUpdatesQuery(result,content) {
		for (var i=0;i<content.Content.length;i++) {
			content.Content[i].lastUpdate=new Date(content.Content[i].lastUpdate);
		}
		cb(true,content.Content)
	}
}