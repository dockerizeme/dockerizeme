/**
 * @module systems/pip/strategy
 */


// Core/NPM Modules
const _              = require('lodash');
const Bluebird       = require('bluebird');
const request        = require('request');


// Import base class
const SystemStrategy = require('../../system-strategy');
const logger         = require('../../logger');


/**
 * PIP strategy implementation.
 */
class PIPStrategy extends SystemStrategy {

    /**
     * Get default run command.
     *
     * @param   {Object} pkg Package object.
     * @returns {Object}     Run command object.
     */
    getInstallRunCommand(pkg) {

        return {
            command: 'pip',
            args: ['install', pkg.version ? `${pkg.name}==${pkg.version}` : pkg.name]
        };

    }

    /**
     * Normalize a package name. PyPI treats package names as case
     * insensitive, and makes no distinction between _ and -.
     *
     * @param   {String} pkg Package name.
     * @returns {String}     Normalized package name.
     */
    normalizePackageName(pkg) {

        return pkg.toLowerCase().replace('_', '-');

    }

    /**
     * Search for an exact package match on PyPI.
     *
     * @param {String} pkg Package name.
     */
    async searchForExactPackageMatch(pkg) {

        // Search for exact match on PyPI
        let response = await Bluebird.fromCallback(cb => request(
            {
                url: encodeURI(`https://pypi.python.org/pypi/${pkg}/json`),
                method: 'GET',
                json: true
            },
            cb
        ));

        // If not found, return null
        // Otherwise return package metadata
        if (response.statusCode === 404) {
            return null;
        }
        else if (response.statusCode === 200) {

            // Get record
            let record = _.get(response, 'body', {});

            // Get releases
            // TODO can filter to releases that support a particular python version
            // may need PEP 440 https://www.python.org/dev/peps/pep-0440/
            let releases = _.flattenDeep(_.values(_.get(record, 'releases', {})));

            // Return if any releases are found
            if (!_.isEmpty(releases)) {
                return {
                    name: _.get(record, 'info.name'),
                    system: 'pip'
                };
            }
            else {
                logger.info('No releases found for', _.get(record, 'info.name'));
                return null;
            }

        }
        else {
            throw new Error(response.body);
        }

    }

}


// Export
module.exports = PIPStrategy;