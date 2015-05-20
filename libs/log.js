"use strict";

var winston = require('winston');

//Return an object to create logs
module.exports = function(mode,file) {
    var log
    if (mode=="debug") {
        log=new (winston.Logger)({
            transports: [
                new (winston.transports.Console)(),
                new (winston.transports.File)({ filename: file })
            ]
        });
    }
    else {
        log=new (winston.Logger)({
            transports: [
                new (winston.transports.File)({ filename: file })
            ]
        });
    }
    return log;
}