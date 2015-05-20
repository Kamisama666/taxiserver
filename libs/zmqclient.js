var zmq = require('zmq');
var queue=require('./queue2')({objec:"algo"});

/*// socket to talk to server
console.log("Connecting to hello world server…");
var requester = zmq.socket('req');

requester.on("message", function(reply) {
	console.log("Received reply: [", reply.toString(), ']');
	
});

requester.connect("ipc://taxiserver");

for (var i = 0; i < 10; i++) {
    console.log("Sending request", i, '…');
	setTimeout(function () {
		requester.send('Hi boss!');
	}, 1000);
}

setTimeout(function () {
	var request=JSON.stringify({Function:"getQueueContent",Arguments:[],Id:1});
	console.log("Sending request: "+request);
	requester.send(request);
}, 1000);


process.on('SIGINT', function() {
	requester.close();
});*/
