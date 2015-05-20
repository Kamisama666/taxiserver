"use strict";
var _ = require("underscore");
var crypto = require("crypto");
var bcrypt = require('bcrypt');
var datalayer;
var log;

/**
 * Hooks for the restify-Oauth2 module to handle the authetication
 * @param  {datalayer object} dblayer  Data Layer
 * @param  {log object} logging Logger object
 * @return {hooks object}         the module itself
 */
module.exports = function(dblayer,logging) {
	datalayer=dblayer;
	log=logging;
	return exports;
}


function afterTokenRevocation(result,content) {
	if (result!==true) {
		log.warn("A token that should have been erased was not. Better clean your DB. Token ID:"+content);
	}
}

/**
 * Generates a token
 * @param  {string} data The data to be used in the token generation (username:password)
 * @return {string}      The generated token
 */
function generateToken(data) {
	var random = Math.floor(Math.random() * 100001);
	var timestamp = (new Date()).getTime();
	var sha256 = crypto.createHmac("sha256", random + "taxiserver" + timestamp);
	var newToken=sha256.update(data).digest("base64");
	return newToken;
}


function validateClientWrapper(credentials, req, cb, user) {
	// Call back with `true` to signal that the client is valid, and `false` otherwise.
	// Call back with an error if you encounter an internal server error situation while trying to validate.

	bcrypt.compare(credentials.clientSecret, user.password, function(err, res) {
    	var isValid=false;
    	if (!err) {
    		isValid=res;
    	}

    	isValid = (user.usuario===credentials.clientId) && isValid;
		if (isValid) {
			log.log("info","Client %s has been validated.",user.id)
		}
		else {
			log.log("info","Client %s has not been validated.",user.id)	
		}

		cb(null, isValid);
	});

	
}

/**
 * Hook para validad un cliente
 * @param  {credentials object}   credentials Credenciales del cliente
 * @param  {request}   req        petición al servidor
 * @param  {Function} cb          función de callback
 */
exports.validateClient = function (credentials, req, cb) {
	datalayer.getUserById(req.params.userid,function(result,content){
			if (result) {
				validateClientWrapper(credentials, req, cb,content)
			}
			else {
				log.log("warn","Error on client validation with the DB: %j",content);
				cb(null, false);
			}
		}
	)
};


function grantScopeWrapper(credentials, scopesRequested, cb, user) {
	var scopesGranted = (user.tipo===scopesRequested[0])?[user.tipo]:false;
	if (scopesGranted!==false) {
		log.log("info","The user %s has been granted with the scope %s.",user.id,scopesGranted[0])
		datalayer.setTokenScope(credentials.token,user.tipo,function(myresult,content){
				if (!myresult) {
					log.log("warn","Error on scope granting with the DB: %s",content);
					scopesGranted=new Error(content);
					datalayer.deleteToken(credentials.token[0],afterTokenRevocation);
				}
			}
		);
	}
	else {
		log.log("info","The scope %s has been denied to the user %s.",scopesRequested[0],user.id)
		datalayer.deleteToken(credentials.token,afterTokenRevocation);
	}
	// Call back with the actual set of scopes granted.
	cb(null, scopesGranted);
}


/**
 * Hook para asignar scope a un usuario
 * @param  {credentials object}   credentials Credenciales del usuario
 * @param  {string}               scopesRequested Scope solicitado
 * @param  {request object}       req Peticion al servidor
 * @param  {Function}             cb  Función de callback
 */
exports.grantScopes = function (credentials, scopesRequested, req, cb) {
	datalayer.getUserById(req.params.userid,  function(result,content){
			if (result) {
				grantScopeWrapper(credentials, scopesRequested, cb, content)
			}
			else {
				log.log("warn","Error on scope granting with the DB: %s",content);
				cb(new Error("Server Internal Error"), null);
			}
		}
	);
};


function grantUserTokenWrapper (credentials, req, cb, user) {
	bcrypt.compare(credentials.password, user.password, function(err, res) {
		var isValid=false;
		if (!err) {
			isValid=res;
		}
		isValid = credentials.username===user.usuario && isValid
		if (isValid) {
			// If the user authenticates, generate a token for them and store it so `exports.authenticateToken` below
			// can look it up later.
			var token = generateToken(credentials.username + ":" + credentials.password);
			datalayer.createTokenForUser(user.id,token,function(result,content){
				if (result){
					log.info("Token created for the user "+user.id);
					// Call back with the token so Restify-OAuth2 can pass it on to the client.
					cb(null, token);
				}
				else {
					log.log("warn","Error on token granting with the DB: ",content);
					cb(new Error(content),null);
				}
			});
		}
		else {
			// Call back with `false` to signal the username/password combination did not authenticate.
			// Calling back with an error would be reserved for internal server error situations.
			cb(null, false);
		}
	});

	
}


/**
 * Grants a token to an user
 * @param  {credentials object}   credentials Credenciales del usuario
 * @param  {request object}       req Peticion al servidor
 * @param  {Function}             cb  Función de callback
 */
exports.grantUserToken = function (credentials, req, cb) {

	function grantUserTokenProcessUser(result,content){
		if (result) {
			grantUserTokenWrapper(credentials, req, cb, content)
		}
		else {
			log.log("warn","Error on token granting with the DB: %s",content);
			cb(new Error("Error on token granting with the DB: "+content), false);
		}
	}

	function grantUserTokenProcessUserTokens(result,content) {
		if (result) {
			if (content.length>0) {
				log.info("Token granting denied for user "+req.params.userid+": He already has a token.")
				cb(Error("Token granting denied for user "+req.params.userid+": He already has a token."),false);
			}
			else {
				datalayer.getUserById(req.params.userid,grantUserTokenProcessUser);
			}
		}
		else {
			log.log("warn","Error on token granting with the DB: %s",content);
			cb(new Error("Error on token granting with the DB: "+content), false);
		}
	}

	datalayer.getTokensOfUser(req.params.userid,grantUserTokenProcessUserTokens)
}


function authenticateTokenWrapper(token, req, cb, tokenlist) {
	var isValid=false;
	for (var i=0;i<tokenlist.length;i++) {
		if (tokenlist[i].token===token) {
			req.username=tokenlist[i].userid;
			req.scopesGranted=tokenlist[i].scope
			isValid=true;
			break;
		}
	}
	if (isValid)
		log.info("Token authenticated for the user: "+req.username)
	else
		log.info("Token not authenticated for the user: "+req.username)
	return cb(null, isValid);
}

/**
 * Hook that authenticates the user
 * @param  {string}   token The user token
 * @param  {request object}   req   The request from the user
 * @param  {Function} cb    The callback function
 */
exports.authenticateToken = function (token, req, cb) {
	datalayer.getTokensOfUser(req.params.userid,function(result, content){
			if (result && content.length>0) {
				authenticateTokenWrapper(token,req,cb,content);
			}
			else {
				if (result) {
					log.info("Token not authenticated for the user: "+req.username)
				}
				else {
					log.warn("Error on error authetication with the DB: "+content);
				}
				cb(null, false);
			}
		}
	);
};

