"use strict";

/**
 * Configures the routes for the api on a server using the configuration
 * provided by the apiroutes module
 * @param  {restify object} server    Api server
 * @param  {apiroutes object} apiroutes Api configuration 
 * @return {restify object}           The provided server with the api routes
 */
module.exports = function(server,apiroutes) {

	for (var i=0;i<apiroutes.length;i++) {
		var route=apiroutes[i];
		var func=route['function'];
		switch(route['method']) {
			case 'GET':
				server.get(route['path'],func);
				break;
			case 'PUT':
				server.put(route['path'],func);
				break;
			case 'DELETE':
				server.del(route['path'],func);
				break;
			case 'POST':
				server.post(route['path'],func);
				break;
		}
	}
	return server;
}
