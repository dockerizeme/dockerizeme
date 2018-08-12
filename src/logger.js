/**
 * Logging module.
 *
 * @module logger
 */


// Core/NPM Modules
const _       = require('lodash');
const winston = require('winston');


// Constants
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    verbose: 3,
    debug: 4,
    silly: 5
};


// Instantiate new logger
module.exports = new winston.Logger({
    level: 'error',
    transports: [new winston.transports.Console({
        timestamp: () => new Date().toISOString(),
        colorize: true,
        stderrLevels: _.keys(LOG_LEVELS)
    })]
});
