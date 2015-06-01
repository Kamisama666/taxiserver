var inspect = require('util').inspect;
var zmq = require('zmq');
var requester = zmq.socket('req');
requester.connect("ipc:///tmp/taxiserver");

var cb=function(resultado1,resultado2){console.log("Resultado("+resultado1+"): "+inspect(resultado2));};

requester.on("message", function(reply) {
	var result={};
	var response=JSON.parse(reply.toString());
	if (response.ID!==1)
		return;

	result.State=response.State;
	if (result.State==="True") {
		result.Content=response.Content;
	}
	else {
		result.Error=response.Error;
	}
	cb(true,result);
});

var request=JSON.stringify({Function:"getQueueContent",Arguments:[],ID:1});
requester.send(request);


