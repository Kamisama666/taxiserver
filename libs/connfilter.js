"use strict";
var dbclient;


/**
 * Checks that the server is ready to attend the clients. In case it doesn't, a message
 * is sended to the clients.
 * @param {object} dbconn MariaDB connection object
 */
function Connfilter(dbconn) {
	dbclient=dbconn;
	return connfilterHandler;
}
module.exports=Connfilter;


function connfilterHandler(req, res, next) {
	if (dbclient.connected) {
		return next();
	}
	return next(new Error("Service Unavailable At This Moment"));
}