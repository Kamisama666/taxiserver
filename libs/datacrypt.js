"use strict";
var crypto = require('crypto');
var algorithm = 'aes-256-ctr'; //The encryption algorithm
var datalayer;


function encrypt(text,secret,cb){
	var cipher = crypto.createCipher(algorithm,secret)
	var crypted;
	try {
		crypted = cipher.update(text,'utf8','hex')
		crypted += cipher.final('hex');
		cb(true,{'secret':crypted});
	}
	catch(err) {
		cb(false,err);
	}
}

function decrypt(text,secret,cb){
	var dec;
	var decipher = crypto.createDecipher(algorithm,secret)
	try {
		dec = decipher.update(text,'hex','utf8')
		dec += decipher.final('utf8');
		cb(true,{'secret':dec});
	}
	catch(err) {
		cb(false,err);
	}
}


/**
 * Decrypts some information using the user Secret Key
 * @param	{string}   userid User ID
 * @param  {string}   text   The text to be decrypted
 * @param  {Function} cb     Callback Function
 */
exports.decryptForUser = function(userid,text,cb) {
	datalayer.getAllSecrets(function processSecrets(result,content){
		if(result) {
			var isInside=false;
			for (var i=0;i<content.length;i++) {
				var currentSecret=content[i];
				if (currentSecret['id']===userid && currentSecret['secret']!==null) {
					isInside=true;
					decrypt(text,currentSecret['secret'],cb);
					break;
				}
			}
			if (isInside===false)
				cb(true,{'noSecret':null});
		}
		else {
			cb(false,"Internal Server Error");
		}
	});
}


/**
 * Encrypts some information using the user Secret Key
 * @param  {string}   userid User ID
 * @param  {string}   text   The text to be encrypted
 * @param  {Function} cb     Callback Function
 */
exports.encryptForUser = function(userid,text,cb) {
	datalayer.getAllSecrets(function processSecrets(result,content){
		if(result) {
			var isInside=false;
			for (var i=0;i<content.length;i++) {
				var currentSecret=content[i];
				if (currentSecret['id']===userid && currentSecret['secret']!==null) {
					isInside=true;
					encrypt(text,currentSecret['secret'],cb);
					break;
				}
			}
			if (isInside===false)
				cb(true,{'noSecret':null});
		}
		else {
			cb(false,"Internal Server Error");
		}
	});
}

/**
 * Module used to encrypt and decrypt information using the secret key
 * of the users. It uses the aes-256-ctr algorithm.
 * @param  {datalayer} dblayer The datalayer module
 * @return {datacrypt}         This module itself
 */
function datacrypt(dblayer) {
	datalayer=dblayer;
	return exports;
}
module.exports = datacrypt;
