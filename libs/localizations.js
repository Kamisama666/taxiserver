"use strict";
var geolib=require('geolib');
var datalayer;


/**
 * Checks if the coordinates are within one of valid localizations
 * @param  {object}   coordinates The coordenates: {latitude:$latitude,longitude:$longitude}
 * @param  {Function} cb          The callback function
 */
exports.isInside = function(coordinates,cb) {
	var userLatitude=coordinates['latitude'];
	var userLongitude=coordinates['longitude'];
	datalayer.getAllLocalizations(function processLocal(result,content){

		if (result) {
			var isInside;
			for (var i=0;i<content.length;i++) {
				isInside=geolib.isPointInside(
					{latitude:userLatitude,longitude:userLongitude},
					[
						{latitude:parseFloat(content[i].lat1),longitude:parseFloat(content[i].lon1)},
						{latitude:parseFloat(content[i].lat2),longitude:parseFloat(content[i].lon2)},
						{latitude:parseFloat(content[i].lat3),longitude:parseFloat(content[i].lon3)},
						{latitude:parseFloat(content[i].lat4),longitude:parseFloat(content[i].lon4)}
					]
				);
				if (isInside) {
					break;
				}
			}
			cb(true,isInside);
			

		}
		else {
			cb(false,"Localization not found")
		}
	});
}


/**
 * Checks if the coordinates are within the selected valid locations
 * @param  {string}   localizationId The location ID
 * @param  {object}   coordinates The coordenates: {latitude:$latitude,longitude:$longitude}
 * @param  {Function} cb          The callback function
 */
exports.isInsideLocalization = function(localizationId,coordinates,cb) {
	var userLatitude=coordinates['latitude'];
	var userLongitude=coordinates['longitude'];
	datalayer.getLocalizationById(localizationId,function DBisInsideLocalization(result,content){
		if (result && content!==null) {
			var isInside=geolib.isPointInside(
				{latitude:userLatitude,longitude:userLongitude},
				[
					{latitude:parseFloat(content.lat1),longitude:parseFloat(content.lon1)},
					{latitude:parseFloat(content.lat2),longitude:parseFloat(content.lon2)},
					{latitude:parseFloat(content.lat3),longitude:parseFloat(content.lon3)},
					{latitude:parseFloat(content.lat4),longitude:parseFloat(content.lon4)}
				]
			);
			cb(true,isInside);
		}
		else {
			cb(false,"Localization not found");
		}
	});
}


module.exports = function(dblayer){
	datalayer=dblayer;
	return exports;
}