"use strict";
var _ = require('underscore');


/**
 * Restify plugin that decrypts the information sent by the user.
 * @param  {datalayer object} datalayer The datalayer module
 * @return {function} The decrypting handler for the request
 */
function secretauth(datalayer) {
	var datacrypt = require('./datacrypt')(datalayer);
	return function decryptSecret(req, res, next) {
		var storedHeaders;

		function decryptBody(result,content){
			if (result && _.has(content,'secret')) {
				try {
					req.body=JSON.parse(content.secret); 
				}
				catch(err){
					
				}
			}
			return next();
		}


		function decryptAuth(result,content){
			if (result && _.has(content,'secret')) {
				storedHeaders['authorization']=content['secret'];
				req.headers=storedHeaders;
				if (_.has(req,'body') && _.has(req.body,'encryptedBody')) {
					datacrypt.decryptForUser(
						req.params.userid,
						req.body['encryptedBody'],
						decryptBody
					);
				}
				else {
					return next();
				}
			}
			else {
				return next();
			}
		}


		if(!_.has(req.params,"userid"))
			return next();
		if (!_.has(req.headers,'authorization'))
			return next();

		storedHeaders=req.headers;
		datacrypt.decryptForUser(
			req.params.userid,
			req.headers.authorization,
			decryptAuth
		);
		
	}
}

module.exports=secretauth;