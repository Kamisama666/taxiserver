"use strict";
var _=require('underscore');
var dbclient;


var usertable='usuarios'; 
var usertable_id='id';
var usertable_name='nombre';
var usertable_type='tipo';
var usertable_secret='secret';
var tokentable='tokens';
var tokentable_id='id';
var tokentable_userid='userid';
var tokentable_token='token';
var tokentable_scope='scope';
var localtable='localizaciones';
var localtable_id='id';
var queuetable='queue';
var queuetable_id='id';
var queuetable_userid='userid';
var queuetable_latitude='lat';
var queuetable_longitude='lng';
var queuetable_lastupdate='lastupdate';



/**
 * This modules provides a series of function to access the data stored on the database.
 * Most of then are safe, but some are unable to check the safety of the parameters. In those
 * cases, the paremeters must come from safe resources,never the outside input.
 * 
 * @param  {object} dbconn DB Connection
 * @return {object}        The module itself
 */
function datalayer(dbconn) {
	dbclient=dbconn;
	return exports;
}
module.exports = datalayer;


/**
 * Comprueba que el userid tengo el formato adecuado
 * @param  {int} id
 * @return {Boolean} true si es correcto, false si no
 */
function isValidID(id) {
	var num=parseInt(id);
	if (isNaN(num) || num<1 || num % 1!==0) {
		return false;
	}
	return true;
}

/**
 * Checks if the user type is valid
 * @param  {string}  type The user type
 * @return {Boolean}      True if it's valid
 */
function isValidType(type){
	return (['CLIENT','DRIVER','COMMSERVER','ADMIN'].indexOf(type)!=-1)?true:false;
}

/**
 * Takes a number that represents a year and transforms into a string 
 * with the format YYYY
 * @param  {number} year The year
 * @return {string}      The formated year
 */
function zeroSafeYear(year) {
	year=year.toString();
	while (year.length<4) {
		year='0'+year;
	}
	return year;
}

/**
 * Takes a number lower than 100 and transforms it to a string formatted as NN
 * @param  {number} digit The number
 * @return {string}       The formated number
 */
function zeroSafe(digit) {
	digit=digit.toString();
	return (digit.length>1)?digit:'0'+digit;
}

/**
 * Trasform a date object into a string with the input format
 * for the datetime type of the DB (YYYY-MM-DD HH:MM:SS)
 * @param  {object} date The date
 * @return {string}      The formated date string
 */
function dateToDatetime(date) {
	return zeroSafeYear(date.getFullYear())+'-'+
	zeroSafe(date.getMonth())+'-'+
	zeroSafe(date.getDate())+' '+
	zeroSafe(date.getHours())+':'+
	zeroSafe(date.getMinutes())+':'+
	zeroSafe(date.getSeconds());
}


/**
 * Devuelve la representación de un usuario a partir de su ID
 * @param  {number} userid El identificador del usuario requerido
 * @param  {function} Funcion a la que pasara el resultado
 */
exports.getUserById = function(userid,cb) {
	var safeid=parseInt(userid).toString();
	if (!isValidID(safeid)) {
		cb(false,new Error('Invalid user ID'));
	}
	else {
		dbclient.query("select * from "+usertable+" where "+usertable_id+" = '"+safeid+"'").on
		(
			'result', 
			function(result) 
			{
				var someResult=false;
				result.on
				(
					'row', 
					function(row) {
						someResult=true;
						cb(true,row); 
					}
				).on
				(
					'error', 
					function(err) { cb(false,err) }
				).on
				(
					'end',
					function(info) { 
						if (!someResult) {
							cb(false,info)
						}
					}
				);
		 	}
		);	
	}
	
}

/**
 * Devuelve la representación de un usuario a partir de su ID
 * @param  {number} userid El identificador del usuario requerido
 * @param  {function} Funcion a la que pasara el resultado
 */
exports.getUserByIdShort = function(userid,cb) {
	var safeid=parseInt(userid).toString();
	if (!isValidID(safeid)) {
		cb(false,new Error('Invalid user ID'));
	}
	else {
		dbclient.query("select "+usertable_id+","+usertable_name+" from "+usertable+" where "+usertable_id+" = '"+safeid+"'").on
		(
			'result', 
			function(result) 
			{
				var someResult=false;
				result.on
				(
					'row', 
					function(row) {
						someResult=true;
						cb(true,row); 
					}
				).on
				(
					'error', 
					function(err) { cb(false,err) }
				).on
				(
					'end',
					function(info) { 
						if (!someResult) {
							cb(false,info)
						}
					}
				);
		 	}
		);	
	}
	
}


/**
 * Devuelve todos los tokens de la base de datos
 * @param  {Function} cb       functión de callback
 */
exports.getAllTokens = function(cb) {
	
	dbclient.query("select "+tokentable_id+","+tokentable_token+" from "+tokentable).on
	(
		'result', 
		function(result) 
		{
			var tokenlist=[];
			result.on
			(
				'row', 
				function(row) { tokenlist.push(row) }
			).on
			(
				'error', 
				function(err) { cb(false,err) }
			).on
			(
				'end', 
			function(info) { cb(true,tokenlist); }
			);
	 	}
	);
}


/**
 * Devuelve la información del token que coincide con el token proporcionado
 * @param  {string}   reqToken Token solicitado
 * @param  {Function} cb       functión de callback
 */
exports.getToken = function(reqToken,cb) {
	dbclient.query("select "+tokentable_id+","+tokentable_token+" from "+tokentable).on
	(
		'result', 
		function(result) 
		{
			var someResult=false;
			result.on
			(
				'row', 
				function(row) { if (row.token===reqToken) {
						someResult=true;
						cb(true,row)
					} 
				}
			).on
			(
				'error', 
				function(err) { cb(false,err) }
			).on
			(
				'end',
				function(info) { if (!someResult) {
					cb(false,info);
				} }
			);
	 	}
	);
}


function setTokenScopeWrapper(tokenid,scope,cb) {
	dbclient.query("update "+tokentable+" set scope='"+scope+"' where "+tokentable_id+"='"+tokenid+"'").on
	(
		'result', 
		function(result) 
		{
			result.on
			(
				'error', 
				function(err) { 
					cb(false,err); 
				}
			).on
			(
				'end', 
				function(info) {
					cb(true,'Token '+tokenid+' Scope Updated'); 
				}
			);
	 	}
	);
}


/**
 * Cambia la scope de un token. Scopes validas = ['CLIENT','DRIVER','COMMSERVER','ADMIN']
 * @param {string}   token    token que se quiere modificar
 * @param {string}   scope    scope que se quiere usa
 * @param {Function} cb       función de callback
 */
exports.setTokenScope = function(token,scope,cb) {

	if (!_.contains(['CLIENT','DRIVER','COMMSERVER','ADMIN'],scope)) {
		cb(false,new Error('Invalid user scope'));
	}

	else {
		exports.getToken(token,function getTokenForScope(result,content){
			if (result) {
				setTokenScopeWrapper(content.id,scope,cb);
			}
			else {
				cb(result,content);
			}
		});
	}
}


/**
 * Get all the tokens of an user
 * @param  {string}   userid   The ID of the use
 * @param {Function} cb       función de callback
 */
exports.getTokensOfUser = function(userid,cb) {
	var safeid=parseInt(userid).toString();
	if (!isValidID(safeid)) {
		cb(false,new Error('Invalid user ID'));
	}
	else {
		dbclient.query(
		"select "+tokentable_id+","+tokentable_token+","+tokentable_scope+","+tokentable_userid+" from "+tokentable+" where "+tokentable_userid+"="+safeid
	).on
		(
			'result', 
			function(result) 
			{
				var tokenlist=[];
				result.on
				(
					'row', 
					function(row) { tokenlist.push(row) }
				).on
				(
					'error', 
					function(err) { cb(false,err) }
				).on
				(
					'end', 
				function(info) { cb(true,tokenlist); }
				);
		 	}
		);	
	}
	
}


/**
 * Get the token that matchs the id
 * @param  {string}   tokenid  The ID of the desired token
 * @param {Function} cb       función de callback
 */
exports.getTokenById = function(tokenid,cb) {
	var safeid=parseInt(tokenid).toString();
	if (!isValidID(safeid)) {
		cb(false,new Error('Invalid user ID'));
	}
	else {
		dbclient.query("select "+tokentable_token+" from "+tokentable+" where "+tokentable_id+"="+safeid).on(
			'result', 
			function(result) 
			{
			var someResult=false;
				result.on
				(
					'row', 
					function(row) { 
						someResult=true;
						cb(true,row);
					}
				).on
				(
					'error', 
					function(err) { cb(false,err) }
				).on
				(
					'end', 
					function(info) {
							if (!someResult) {
								cb(true,info);
							}
						}
					);
			}
		);
	}
}


/**
 * Create a new token for an user. Unsafe function, never to be used with a 
 * externaly provided token
 * @param  {string}   userid   id of the user
 * @param  {string}   token    new token value
 * @param  {Function} cb       Callback function
 */
exports.createTokenForUser = function(userid,token,cb) {
	var safeid=parseInt(userid).toString();
	if (!isValidID(safeid)) {
		cb(false,new Error('Invalid user ID'));
	}
	else {
		var myresult;
		dbclient.query("insert into "+tokentable+" (token,userid) values ('"+token+"',"+safeid+")").on(

			'result', 
			function(result) 
			{
				result.on
				(
					'error', 
					function(err) { cb(false,err); }
				).on
				(
					'end', 
				function(info) { myresult=info }
				);
		 	}
		).on
		(
			'end',
			function(){
				cb(true, myresult);
			}
		);
	}
}


function deleteTokenWrapper(tokenid,cb) {
	dbclient.query("delete from "+tokentable+" where "+tokentable_id+"="+tokenid).on(
		'result',
		function(result)
		{
			result.on
			(
				'error',
				function(err) { cb(false,tokenid) }
			).on
			(
				'end',
				function(info) { cb(true,info); }
			)
		}
	);
}


/**
 * Delete a token
 * @param  {string}   token    The token value
 * @param  {Function} cb       Callback function
 */
exports.deleteToken=function(token,cb) {
	exports.getToken(token,function(result,content){
		if (result) {
			deleteTokenWrapper(content.id,cb);
		}
		else {
			cb(result,content)
		}
	});
}


/**
 * Get all of the users of a type
 * @param  {Function} cb       Callback function
 */
exports.getUsersByType = function(type,cb) {
	if (isValidType(type)) {
		dbclient.query("select "+usertable_id+","+usertable_name+" from "+usertable+" where "+usertable_type+"='"+type+"'" ).on(
		'result',
		function(result)
		{
			var resultList=[];
			result.on
			(
				'row', 
				function(row) { resultList.push(row); }
			).on
			(
				'error',
				function(err) { cb(false,err) }
			).on
			(
				'end',
				function(info) { cb(true,resultList); }
			)
		}
	);
	}
	else {
		cb(false,"Invalid user type")
	}
}

/**
 * Get all the driver users
 * @param  {Function} cb       Callback function
 */
exports.getAllDrivers = function(cb) {
	exports.getUsersByType('DRIVER',cb);
}


/**
 * Gets the data of all the localizations
 * @param  {Function} cb       Callback function
 */
exports.getAllLocalizations = function(cb) {
	dbclient.query("select * from "+localtable).on(
		'result',
		function(result) {
			var resultList=[];
			result.on
			(
				'row', 
				function(row) { resultList.push(row); }
			).on
			(
				'error',
				function(err) { cb(false,err) }
			).on
			(
				'end',
				function(info) { cb(true,resultList); }
			)
		}
	);
}



/**
 * Gets a localization info by its ID
 * @param  {string}   id The localization ID
 * @param  {Function} cb       Callback function
 */
exports.getLocalizationById = function(id, cb) {
	if (!isValidID(id)) {
		cb(false,"Invalid Localization ID");
		return;
	}
	dbclient.query("select * from "+localtable+" where "+localtable_id+"="+id).on(
		'result', 
		function(result) {
		var someResult=false;
			result.on
			(
				'row', 
				function(row) { 
					someResult=true;
					cb(true,row);
				}
			).on
			(
				'error', 
				function(err) {cb(false,err);}
			).on
			(
				'end', 
				function(info) {
					if (!someResult) {
						cb(true,null);
					}
				}
			);
		}
	);

}


/**
 * Gets all the stored secrets
 * @param  {Function} cb       Callback function
 */
exports.getAllSecrets = function(cb) {
	dbclient.query("select "+usertable_id+","+usertable_secret+" from "+usertable).on(
		'result',
		function(result) {
			var resultList=[];
			result.on
			(
				'row', 
				function(row) { resultList.push(row); }
			).on
			(
				'error',
				function(err) { cb(false,err) }
			).on
			(
				'end',
				function(info) { cb(true,resultList); }
			)
		}
	);
}


/**
 * Insert an user into the queue
 * @param  {object}   user The user
 * @param  {Function} cb       Callback function
 */
exports.addUserToQueue = function(user,cb) {
	if (!isValidID(user.userid)) {
		return cb(false,"Invalid Localization ID");
		
	}
	var queryFields=queuetable_userid+","+queuetable_longitude+","+queuetable_latitude+","+queuetable_lastupdate;
	var queryValues=user.userid+","+user.location.lon()+","+user.location.lat()+",'"+dateToDatetime(user.lastUpdate)+"'";
	var myresult;
	dbclient.query("insert into queue ("+queryFields+") values("+queryValues+")").on(
		'result',
		function(result) {
			result.on
				(
					'error', 
					function(err) { cb(false,err); }
				).on
				(
					'end', 
				function(info) { myresult=info }
				);
		}
	).on(
		'end',
		function(){
			cb(true, myresult);
		}
	);
}


/**
 * Takes the user from the queue
 * @param  {string}   userid The user ID
 * @param  {Function} cb       Callback function
 */
exports.takeUserFromQueue = function(userid,cb) {
	dbclient.query("delete from "+queuetable+" where "+queuetable_userid+"="+userid).on(
		'result',
		function(result)
		{
			result.on
			(
				'error',
				function(err) { cb(false,err) }
			).on
			(
				'end',
				function(info) { cb(true,info); }
			)
		}
	);
}


/**
 * Udtates the informatio of the user on queue
 * @param  {object}   user The user
 * @param  {Function} cb       Callback function
 */
exports.updateUserFromQueue = function(user,cb) {
	if (!isValidID(user.userid)) {
		return cb(false,"Invalid Localization ID");
	}
	var queryUpdates=queuetable_longitude+"="+user.location.lon()+",";
	queryUpdates+=queuetable_latitude+"="+user.location.lat()+",";
	queryUpdates+=queuetable_lastupdate+"='"+dateToDatetime(user.lastUpdate)+"'";
	var queryWhere=queuetable_userid+"="+user.userid;

	dbclient.query("update "+queuetable+" set "+queryUpdates+" where "+queryWhere).on(
		'result', 
		function(result) 
		{
			result.on
			(
				'error', 
				function(err) { 
					cb(false,err); 
				}
			).on
			(
				'end', 
				function(info) {
					cb(true,info); 
				}
			);
	 	}
	); 
}


/**
 * Empties the content of the queue
 * @param  {Function} cb       Callback function
 */
exports.emptyQueue= function(cb) {
	dbclient.query("delete from "+queuetable).on(
		'result', 
		function(result) 
		{
			result.on
			(
				'error', 
				function(err) { 
					cb(false,err); 
				}
			).on
			(
				'end', 
				function(info) {
					cb(true,info); 
				}
			);
	 	}
	);

}


/*exports.getFromQueueByID = function(userid,cb) {
	if (!isValidID(userid)) {
		return cb(false,"Invalid user ID");
	}
	var querySelected=queuetable_longitude+","+queuetable_latitude+","+queuetable_lastupdate;
	dbclient.query("select "+querySelected+" from "+queuetable+" where "+queuetable_userid+"='"+userid+"'").on(
		'result',
		function(result) {
			var resultList=[];
			result.on
			(
				'row', 
				function(row) { resultList.push(row); }
			).on
			(
				'error',
				function(err) { cb(false,err) }
			).on
			(
				'end',
				function(info) { cb(true,resultList); }
			)
		}
	);
}*/