/**
 * @module dockerize
 */


// Core/NPM Modules

const Bluebird        = require('bluebird');
const _               = require('lodash');


// Local Modules
const StrategyFactory = require('./strategy-factory');
const logger          = require('./logger');


// Factory
const factory = new StrategyFactory();


/**
 * Dockerize a code snippet using a language pack.
 *
 * @param   {Object}                                     options              Dockerize options
 * @param   {String}                                     options.pkg          Package name.
 * @param   {Object}                                     options.language     Language used to build dockerfile.
 * @param   {Object}                                     options.cmd          Command to run at startup.
 * @param   {String}                                     options.cmd.command  Run command.
 * @param   {Array.<String>}                             options.cmd.args     Command arguments.
 * @param   {'dockerfile'|'install-commands'|'metadata'} options.format       Return format.
 * @param   {String}                                     options.only         Only use specific rules for generating dependencies.
 * @returns {String}                                                          Dockerfile contents
 */
module.exports = async function(options = {}) {

    // Set default language
    options.language = options.language || 'python';

    // Get language strategy
    let strategy = await factory.getLanguageStrategy(options.language || 'python');

    // Generate dockerfile
    logger.info('Dockerizing with', options);
    let data = await strategy.getDockerfileData(options);

    // Return the correct output based on format
    switch (options.format) {
        case 'metadata':
            return data;
        case 'install-commands':
            return data.installCommands;
        default:
            return data.dockerfile;
    }

};
