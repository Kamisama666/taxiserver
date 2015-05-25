"use strict";
var queue;
var log;
var CronJob = require('cron').CronJob;
var fiveMin = 1000 * 60 * 5; 

function cleanQueue() {
	queue.getAllLastUpdates(function processUpdates(result,usersUpdates){
		for (var i=0;i<usersUpdates.length;i++) {
			var currentUser=usersUpdates[i];
			var past=currentUser.lastUpdate;
			var isPast = (new Date().getTime() - past < fiveMin)?false:true;
			if (isPast) {
				queue.takeUserFromQueue(currentUser.userid,function(result,content){
					if (result) {
						log.info("The user "+currentUser.userid+" has been removed from queue for inactivity");
					}
					else {
						log.warn("An error ocurred while taking the user "+currentUser.userid+" from the queue: "+content);
					}
				});
			}
		}
	});
}

/**
 * Checks the queue every five minutes and takes out all the user that haven't updated 
 * their positon in more than five minutes
 * @param  {object} iqueue  Queue object
 * @param  {object} logging Logging module
 * @return {object}         This module itself
 */
function cleanQueue(iqueue,logging){
	queue=iqueue;
	log=logging;
	var cleaner=new CronJob({cronTime:"*/5 * * * *",onTick:cleanQueue,start:true});
	//log.info("Queue Cleaner iniciated.");
	return cleaner;
}
module.exports = cleanQueue;