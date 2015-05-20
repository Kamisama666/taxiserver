"use strict";
var apihandler;


/**
 * Builds the api structure
 * @param  {apihandler object} handlers The handlers for the api routes
 * @return {apiroutes object}          The object that contains the api routes
 */
module.exports=function(handlers){
	apihandler=handlers;
	var apiroutes=[
		{
			path:"/api/:userid",
			method:"GET",
			function:apihandler.apimain
		},
		{
			path:"/api/1.0.0/:userid/users/drivers",
			method:"GET",
			function:apihandler.apiAllDrivers
		},
		{
			path:"/api/1.0.0/:userid/users/drivers/:requserid",
			method:"GET",
			function:apihandler.apiGetDriver
		},
		{
			path:"/api/1.0.0/:userid/queue",
			method:"GET",
			function:apihandler.apiGetQueue
		},
		{
			path:"/api/1.0.0/:userid/queue",
			method:"POST",
			function:apihandler.apiAddToQueue
		},
		{
			path:"/api/1.0.0/:userid/queue/next",
			method:'GET',
			function:apihandler.apiGetNextOnQueue
		},
		{
			path:"/api/1.0.0/:userid/queue/:requserid",
			method:"GET",
			function:apihandler.apiGetDriverPosition
		},
		{
			path:"/api/1.0.0/:userid/queue/:requserid",
			method:"DELETE",
			function:apihandler.apiTakeUserFromQueue
		},
		{
			path:"/api/1.0.0/:userid/queue/:requserid/location",
			method:"GET",
			function:apihandler.apiGetDriverLocalization
		},
		{
			path:"/api/1.0.0/:userid/queue/:requserid/location",
			method:"PUT",
			function:apihandler.apiUpdateDriverLocation
		},
		{
			path:"/api/1.0.0/:userid/localizations",
			method:"GET",
			function:apihandler.apiGetAllLocalizations
		},
		{
			path:"/api/1.0.0/:userid/localizations",
			method:"POST",
			function:apihandler.apiValidateCoordenates
		},
		{
			path:"/api/1.0.0/:userid/localizations/:locationid",
			method:"GET",
			function:apihandler.apiGetLocalization
		},
		{
			path:"/api/1.0.0/:userid/localizations/:locationid",
			method:"POST",
			function:apihandler.apiValidateCoordenatesForLocalization
		}
	];
	return apiroutes;
}