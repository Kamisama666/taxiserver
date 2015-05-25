"use strict";
var fs = require('fs');
var _=require('underscore')
var queue;
var datacrypt;
var nconf;
var datalayer;
var log;
var localizations;
var thisApiVersion='1.0.0';


/**
 * Handlers for the api routes.
 * @param  {object} conf    Configuration module
 * @param  {object} dblayer DB layer module
 * @return {object}         The module itself
 */
function apihandler(conf,dblayer,logging,userQueue) {
	nconf=conf;
	datalayer=dblayer;
	log=logging;
	queue=userQueue;
	localizations=require('./localizations')(datalayer);
	datacrypt=require('./datacrypt')(datalayer);

	return exports;
}
module.exports = apihandler;


/**
 * Get the list of available versions of the api
 * @return {array} List of available versions of the api
 */
function getApiVersions() {
	return [nconf.get("api:version")].concat(nconf.get("api:oldversions"));

}


/**
 * check if the user is a driver
 * @param  {object}  req The user request
 * @return {Boolean}     True if it is, false if not
 */
function isDriver(req) {
	return (req.scopesGranted==='DRIVER')?true:false;
}


/**
 * check if the user is a commserver
 * @param  {object}  req The user request
 * @return {Boolean}     True if it is, false if not
 */
function isCommserver(req) {
	return (req.scopesGranted==='COMMSERVER')?true:false;	
}


/**
 * check if the user is allowed to the provate resource
 * @param  {object}  req The user request
 * @return {Boolean}     True if it is, false if not
 */
function isAllowedToPrivate(req) {
	return (req.username===req.params.requserid)?true:false;
}


/**
 * Sends the response back to the user encrypted
 * @param  {string} userid    The user ID
 * @param  {object} res  The response Object
 * @param  {string} plainText The response text
 */
function sendEncrypted(userid,res,plainText) {
	datacrypt.encryptForUser(userid,plainText,function encrypTextHandler(result,content){
		var response={}
		if (!result) {
			response.State="False";
			response.Error="Internal Server Error";
			res.send(response)
		}
		else {
			response.State="True"
			if (_.has(content,'secret')) {
				response.Content=content['secret'];
			}
			else {
				response.Content=plainText;	
			}
			res.send(response)
		}
			
	});
}


/**
 * Check if the request contains the prodived parameters
 * @param  {object} req The user request
 * @param  {array} requiredParam The required parameters
 * @return {Boolean}     True if they are, false if not
 */
function reqContains(req,requiredParam) {
	var result=true;
	for (var i=0;i<requiredParam.length;i++) {
		if (!_.has(req.body,requiredParam[i])) {
			result=false;
		}
	}
	return result;
}

 
/**
 * Send back the routes to the available api versions
 * /api/:userid <------GET
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apimain=function(req, res, next) {
	var path=req.path().split("/")[1];
	var versions=getApiVersions();
	var versionsList=[];
	for (var i=0;i<versions.length;i++){
		var element={};
		element[versions[i]]="/"+path+'/'+versions[i]+"/"+(req.username || ':userid');
		versionsList.push(element);
	}
	var response={True:{
		info:nconf.get("application:name")+" "+nconf.get("application:version"),
		versions:versionsList}
	};
	sendEncrypted(req.username,res,JSON.stringify(response));
	//res.send(response);
	return next();
}



/**
 * Sends back the information of all the registered drivers
 * /api/:apiversion/:userid/users/drivers <------GET
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiAllDrivers = function(req,res,next) {
	var response={}
	var apipath="/api/:apiversion/:userid/users/drivers <------GET";
	log.info("User "+req.username+" has requested access to: "+apipath);
	if (isDriver(req)) {
		datalayer.getAllDrivers(function(result,content){
				if (result) {
					for (var i=0;i<content.length;i++) {
						content[i].path="/api/"+thisApiVersion+"/"+req.username+"/users/drivers/"+content[i].id;
					}
					response.State="True";
					response.Content=content;
				}
				else {
					log.warn("An error ocurred whithe the user "+req.username+" was accessing "+apipath+": ("+content+")");
					response.State="False";
					response.Error="Sorry, an error ocurred. Try again later";
				}
				sendEncrypted(req.username,res,JSON.stringify(response));
			}
		);
	}
	else {
		log.info("Access has been denied All the driver info for the user "+req.username);
		response.State="False";
		response.Error="You are not allowed to access this resource";
		sendEncrypted(req.username,res,JSON.stringify(response));
	}
	return next();	
}


/**
 * Send back the information of an user
 * /api/:apiversion/:userid/users/drivers/:requserid <------GET
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiGetDriver = function(req,res,next) {
	var response={};
	var apipath="/api/:apiversion/:userid/users/drivers/:requserid <------GET";
	log.info("The user "+req.username+" has requested access to: "+apipath);
	if (isDriver(req)) {
		datalayer.getUserByIdShort(req.params.requserid,function(result,content){
				if (result) {
					content.path="/api/"+thisApiVersion+"/"+req.username+"/users/drivers/"+req.params.requserid
					response.State="True";
					response.Content=content;
				}
				else {
					log.warn("An error ocurred whithe the user "+req.username+" was accessing "+apipath+": ("+content+")");
					response.State="False";
					response.Error="Sorry, an error ocurred. Try again later";
				}
				sendEncrypted(req.username,res,JSON.stringify(response));
			}
		);
	}
	else {
		log.info("Access has been denied All the driver info for the user "+req.username);
		response.State="False";
		response.Error="You are not allowed to access this resource";
		sendEncrypted(req.username,res,JSON.stringify(response));
	}
	return next();
}


/**
 * Sends back the content of the queue.
 * /api/:apiversion/:userid/queue <------GET
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiGetQueue = function(req,res,next) {
	var apipath="/api/:apiversion/:userid/queue <------GET";
	log.info("The user "+req.username+" has requested access to: "+apipath);
	if (isDriver(req)) {
		queue.getQueueContent(function(result,content){
			var response={};
			if (result) {
				response.State="True";
				response.Content=content;
			}
			else {
				log.warn("An error ocurred while the user "+req.username+" was accessing "+apipath+": ("+content+")");
				response.State="False";
				response.Error=content;
			}
			sendEncrypted(req.username,res,JSON.stringify(response));		
		});
	}
	else {
		log.info("Access has been denied to "+apipath+" for the user "+req.username);
		response.State="False";
		response.Error="You are not allowed to access this resource";
		sendEncrypted(req.username,res,JSON.stringify(response));
	}
	return next();
}


/**
 * Add the user to the queue
 * /api/:apiversion/:userid/queue <------POST
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiAddToQueue = function(req,res,next) {
	var apipath="/api/:apiversion/:userid/queue <------POST";
	function processAddToQueue(result,content){
		var response={};
		if (result) {
			response.State="True";
			response.Content=content;
		}
		else {
			response.State="False";
			response.Content=content;
		}
		sendEncrypted(req.username,res,JSON.stringify(response));
	}

	function processLocalizations(result,content){
		if (result) {
			if (content) {
				queue.addToQueue(
					req.username,
					req.body.latitude,
					req.body.longitude,
					processAddToQueue
				);
			}
			else {
				sendEncrypted(
					req.username,
					res,
					JSON.stringify({"State":"False","Error":"Invalid localization"})
				);
			}
		}
		else {
			log.warn("An error ocurred while the user "+req.username+" was accessing "+apipath+": ("+content+")");
			sendEncrypted(
				req.username,
				res,
				JSON.stringify({"State":"False","Error":"Internal Server Error"})
			);
		}
	}

	log.info("The user "+req.username+" has requested access to: "+apipath);
	if (isDriver(req) && reqContains(req,['longitude','latitude'])) {
		localizations.isInside(
			{"longitude":req.body.longitude,"latitude":req.body.latitude},
			processLocalizations
		);
	}
	else {
		log.info("The user "+req.username+" has been denied access to: "+apipath);
		sendEncrypted(
			req.username,
			res,
			JSON.stringify({"State":"False","Error":"You are not allowed to access this resource"})
		);
	}
	return next();
}


/**
 * Send back the position of the driver in the queue
 * /api/:apiversion/:userid/queue/:requserid <------GET
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiGetDriverPosition = function(req,res,next) {
	var apipath="/api/:apiversion/:userid/queue/:requserid <------GET";
	log.info("The user "+req.username+" has requested access to: "+apipath);	
	if (isDriver(req)) {
		queue.getPositionOfUser(req.params.requserid, function(result,content){
			var response={}
			console.log(content.Content);
			if (result && content.Content!==-1) {
				response.State="True";
				response.Content={'userPosition':content.Content}
			}
			else {
				response.State="False";
				response.Error="The user "+req.params.requserid+" is not on queue";
			}
			sendEncrypted(req.username,res,JSON.stringify(response));
		});
	}
	else {
		log.info("The user "+req.username+" has been denied access to: "+apipath);
		sendEncrypted(
			req.username,
			res,
			JSON.stringify({"State":"False","Error":"You are not allowed to access this resource"})
		);
	}
	return next();
}


/**
 * Takes an user from the queue
 * /api/:apiversion/:userid/queue/:requserid <------DELETE
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiTakeUserFromQueue = function(req,res,next) {
	var apipath="/api/:apiversion/:userid/queue/:requserid <------DELETE";
	log.info("The user "+req.username+" has requested access to: "+apipath)
	if (!isDriver(req) || !isAllowedToPrivate(req)) {
		log.info("The user "+req.username+" has been denied access to: "+apipath);
		sendEncrypted(
			req.username,
			res,
			JSON.stringify({"State":"False","Error":"You are not allowed to access this resource"})
		);
		return next();
	}

	queue.takeUserFromQueue(req.params.requserid,reciveFromQueue);

	function reciveFromQueue(result,content) {
		var response={};
		if (result) {
			response.State="True";
			response.Content=content;
		}
		else {
			response.State="False";
			response.Error=content;
		}
		sendEncrypted(req.username,res,JSON.stringify(response));
	}
	return next();
}


/**
 * Sends back the location of an user on the queue
 * /api/:apiversion/:userid/queue/:requserid/location <------GET
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiGetDriverLocalization = function(req,res,next) {
	var apipath="/api/:apiversion/:userid/queue/:requserid/location <------GET";
	if (isDriver(req)) {
	log.info("The user "+req.username+" has requested access to: "+apipath)
		queue.getUserLocation(req.params.requserid,function(result,content){
			var response={};
			if (result){
				response.State="True";
				response.Content={'userLocation':content};
			}
			else {
				response.State="False";
				response.Error="The user "+req.params.requserid+" is not on queue";
			}
			sendEncrypted(req.username,res,JSON.stringify(response));
		});
	}
	else {
		log.info("The user "+req.username+" has been denied access to: "+apipath);
		sendEncrypted(
			req.username,
			res,
			JSON.stringify({"State":"False","Error":"You are not allowed to access this resource"})
		);
	}
	return next();
}


/**
 * Updates the location of an user on the queue
 * /api/:apiversion/:userid/queue/:requserid/location <------PUT
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiUpdateDriverLocation = function(req,res,next) {
	var response={};
	var apipath="/api/:apiversion/:userid/queue/:requserid/location <------PUT";
	log.info("The user "+req.username+" has requested access to: "+apipath);
	
	function takeUserFromQueueCB(result,content) {
		if (result) {
			response.State="False";
			response.Error="Invalid Localization. User taken from queue";
		}
		else {
			response.State="False";
			response.Error="Invalid Localization";
		}
		sendEncrypted(req.username,res,JSON.stringify(response));
	}

	function processLocalizations(result, content){
				if (result) {
					if (content) {
						queue.updateDriverLocation(
							req.params.requserid,
							req.body.latitude,
							req.body.longitude,
							function(result,content){
								if (result) {
									response.State="True";
									response.Content=content;
								}
								else {
									response.State="False";
									response.Error=content;
								}
								sendEncrypted(req.username,res,JSON.stringify(response));
							});
					}
					else {
						queue.takeUserFromQueue(req.username,takeUserFromQueueCB);
					}
					
				}
				else {
					response.State="False";
					response.Error="Internal Server Error";
					sendEncrypted(req.username,res,JSON.stringify(response));
				}
			}

	if (isDriver(req) && isAllowedToPrivate(req) && reqContains(req,['longitude','latitude'])) {
		
		localizations.isInside(
			{"longitude":req.body.longitude,"latitude":req.body.latitude},
			processLocalizations
		);
	}
	else {
		log.info("The user "+req.username+" has been denied access to: "+apipath);
		response.State="False";
		response.Error="You are not allowed to access this resource";
		sendEncrypted(req.username,res,JSON.stringify(response));
	}
	return next();
}


/**
 * Takes the first user from the queue and sends it back
 * /api/:apiversion/:userid/queue/next <------GET
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiGetNextOnQueue = function(req,res,next) {
	var apitpath="/api/:apiversion/:userid/queue/next <------GET";
	var response={};
	log.info("The user "+req.username+" has requested access to: "+apitpath)
	if (isCommserver(req)) {
		queue.takeNextUserFromQueue(function(result,content){
			if (result) {
				response.State="True";
				response.Content=content;
			}
			else {
				response.State="False";
				response.Error=content;
			}
			sendEncrypted(req.username,res,JSON.stringify(response));
		});
	}
	else {
		log.info("The user "+req.username+" has been denied access to: "+apipath);
		response.State="False";
		response.Error="You are not allowed to access this resource";
		sendEncrypted(req.username,res,JSON.stringify(response));
	}
	return next();
}


/**
 * Returns all the localizations stored on the database
 * /api/:apiversion/:userid/localizations <------GET
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiGetAllLocalizations = function(req,res,next) {
	var apipath="/api/:apiversion/:userid/localizations <------GET";
	var response={};
	log.info("The user "+req.username+" has requested access to: "+apipath)

	function DbProcessApiGetAllLocalizations(result,content){
		if (result) {
			response.State="True";
			response.Content=content;
		}
		else {
			response.State="False";
			response.Error=content;
		}
		sendEncrypted(req.username,res,JSON.stringify(response));
	}

	if (isDriver(req)) {
		datalayer.getAllLocalizations(DbProcessApiGetAllLocalizations);
	}
	else {
		log.info("The user "+req.username+" has been denied access to: "+apipath);
		response.State="False";
		response.Error="You are not allowed to access this resource";
		sendEncrypted(req.username,res,JSON.stringify(response));
	}
	return next();
}


/**
 * Validates some coodenates against all the localizations
 * /api/:apiversion/:userid/localizations <------POST
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiValidateCoordenates = function(req,res,next) {
	var apipath="/api/:apiversion/:userid/localizations <------POST";
	var response={};
	log.info("The user "+req.username+" has requested access to: "+apipath)
	if (!isDriver(req)) {
		log.info("The user "+req.username+" has been denied access to: "+apipath);
		response.State="False";
		response.Error="You are not allowed to access this resource";
		sendEncrypted(req.username,res,JSON.stringify(response));
		return next();
	}
	if (!reqContains(req,['longitude','latitude'])) {
		response.State="False";
		response.Error="Fields are mixing: longitude, latitude";
		sendEncrypted(req.username,res,JSON.stringify(response));
		return next();
	}

	function apiValidateCoordenatesCallback(result,content) {
		if (!result) {
			response.State="False";
			response.Error=Content;
			sendEncrypted(req.username,res,JSON.stringify(response));
			return next();
		}
		
		response.State="True";
		response.Content=content.toString();
		sendEncrypted(req.username,res,JSON.stringify(response));
		return next();
		
	}

	localizations.isInside({latitude:req.body.latitude,longitude:req.body.longitude},apiValidateCoordenatesCallback);	
}


/**
 * Returns a localization identified by its ID
 * /api/:apiversion/:userid/localizations/:locationid <------GET
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiGetLocalization = function(req,res,next) {
	var apipath="/api/:apiversion/:userid/localizations/:locationid <------GET";
	var response={};
	log.info("The user "+req.username+" has requested access to: "+apipath)
	if (!isDriver(req)) {
		log.info("The user "+req.username+" has been denied access to: "+apipath);
		response.State="False";
		response.Error="You are not allowed to access this resource";
		sendEncrypted(req.username,res,JSON.stringify(response));
		return next();
	}

	function apiGetLocalizationCallback(result, content) {
		if (!result) {
			response.State="False";
			response.Error=content;
			sendEncrypted(req.username,res,JSON.stringify(response));
			return next();
		}
		response.State="True";
		response.Content=content;
		sendEncrypted(req.username,res,JSON.stringify(response));
		return next();
	}

	datalayer.getLocalizationById(req.params.locationid,apiGetLocalizationCallback);
}


/**
 * Validates some coodenates against a localization identified by its ID
 * /api/:apiversion/:userid/localizations/:locationid <------POST
 * @param  {object}   req  The user request
 * @param  {object}   res  The user response
 * @param  {Function} next The next operation
 */
exports.apiValidateCoordenatesForLocalization= function(req,res,next) {
	var apipath="/api/:apiversion/:userid/localizations/:locationid <------POST";
	var response={};
	log.info("The user "+req.username+" has requested access to: "+apipath)
	if (!isDriver(req)) {
		log.info("The user "+req.username+" has been denied access to: "+apipath);
		response.State="False";
		response.Error="You are not allowed to access this resource";
		sendEncrypted(req.username,res,JSON.stringify(response));
		return next();
	}
	if (!reqContains(req,['longitude','latitude'])) {
		response.State="False";
		response.Error="Fields are mixing: longitude, latitude";
		sendEncrypted(req.username,res,JSON.stringify(response));
		return next();
	}

	function apiValidateCoordenatesForLocalizationCallback(result,content) {
		if (!result) {
			response.State="False";
			response.Error=content;
			sendEncrypted(req.username,res,JSON.stringify(response));
			return next();
		}
		response.State="True";
		response.Content=content.toString();
		sendEncrypted(req.username,res,JSON.stringify(response));
		return next();
	}

	localizations.isInsideLocalization(
		req.params.locationid,
		{latitude:req.body.latitude,longitude:req.body.longitude},
		apiValidateCoordenatesForLocalizationCallback
	)
}
