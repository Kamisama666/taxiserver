"use strict";
/**
 * The object for the user inside the queue
 * @param {string} userid   The user id
 * @param {object} location The location of the user (geoutil)
 * @param {string} extension   The user extension
 */
function queueUser(userid,location,extension) {
	this.userid=userid;
	this.location=location;
	this.lastUpdate=new Date();
	this.extension=extension;
}
module.exports=queueUser;