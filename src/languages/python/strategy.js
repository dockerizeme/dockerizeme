/**
 * @module languages/python/strategy
 */


// Core/NPM Modules
const path             = require('path');
const _                = require('lodash');


// Local Modules
const LanguageStrategy = require('../../language-strategy');


/**
 * Python strategy class
 */
class PythonStrategy extends LanguageStrategy {

    /**
     * Language name.
     *
     * @returns {String} Language name.
     */
    get language() { return 'python'; }

    /**
     * Path to executable dependency parser.
     *
     * @returns {String} Dependency parser path.
     */
    get dependencyParser() { return path.resolve(__dirname, 'parse.py'); }

    /**
     * Docker image name.
     *
     * @returns {String} Docker image name.
     */
    get imageName() { return 'python'; };

    /**
     * Docker image version.
     *
     * @returns {String} Docker image version.
     */
    get imageVersion() { return '2.7.13'; }

    /**
     * Name for the language's default package management system.
     *
     * @returns {String} Package management system.
     */
    get system() { return 'pip'; }

    /**
     * Override LanguageStrategy#getRunInstallDependencies to
     * detect if `apt-get update` should to be run.
     *
     * @param   {String}          pkg          Path to code package or snippet.
     * @param   {Object}          options      Options object.
     * @param   {'assoc'|'deps'}  options.only Only use association rules or dependency rules. Both used if not specified.
     * @returns {Promise.<Array>}              List of generated run commands to install dependencies.
     */
    async getRunInstallDependencies(pkg, options) {

        // Get deps
        let run = await super.getRunInstallDependencies(pkg, options);

        // Add apt-get update
        if (_.some(run, ['command', 'apt-get'])) {
            run = _.concat(
                [{ command: 'apt-get', args: ['update'] }],
                run
            )
        }

        // Return
        return run

    }

    /**
     * Get the default docker command for copying pkg into the Dockerfile.
     *
     * @param {String} pkg Path to package.
     */
    getDefaultCopyCommand(pkg) {

        return {
            src: path.normalize(path.relative(path.resolve(), pkg)),
            dst: `/${path.basename(pkg)}`
        };

    }

    /**
     * Get the default docker command CMD.
     *
     * @param {String} pkg Path to package.
     */
    getDefaultDockerCommand(pkg) {

        // Assumes __main__ module present in directory.
        return { command: 'python', args: [ `/${path.basename(pkg)}` ] };

    }

}


// Export
module.exports = PythonStrategy;