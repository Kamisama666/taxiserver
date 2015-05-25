"use strict";
var fs = require('fs');
var thisProcess = require('child_process');
var log;
var child;

/**
 * Fork a child process to run the queue
 * @param  {string} queue_path The path to the queue module
 * @param  {object} logging    The logging module
 * @return {object}            The child process forked
 */
function fork_queue(queue_path,logging) {
	log=logging;
	child=thisProcess.spawn('node',[queue_path]);
	child.stdout.on('data',childData);
	child.on('error',childError);
	child.on('close',childClose);
	child.on('disconnect',childDisconnect);
	
	return child;
}
module.exports=fork_queue;


function childData(data) {
	log.log('info','Output from queue: '+data);
}


function childError(err) {
	log.log('error','Error on queue process: '+err);
}


function childClose(code,signal) {
	if (code!==null) {
		log.log('info','Queue process closed normally: '+code);
	}
	else {
		log.log('error','Queue process closed with signal: '+signal);	
	}
}

function childDisconnect() {
	log.log('info',"Queue process disconnected");
}

