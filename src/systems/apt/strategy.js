/**
 * @module systems/apt/strategy
 */


// Import base class
const SystemStrategy = require('../../system-strategy');


/**
 * APT strategy implementation.
 */
class APTStrategy extends SystemStrategy {

    /**
     * Get default run command.
     *
     * @param   {Object} pkg Package object.
     * @returns {Object}     Run command object.
     */
    getInstallRunCommand(pkg) {

        return {
            command: 'apt-get',
            args: ['install', '-y', pkg.version ? `${pkg.name}=${pkg.version}` : pkg.name]
        };

    }

    /**
     * Search for an exact package match.
     * In the case of API, packages are validated before being
     * placed in the database, so just return the package name.
     *
     * @param {String} pkg Package name.
     */
    async searchForExactPackageMatch(pkg) {

        return { name: pkg, system: 'apt' }

    }

}


// Export
module.exports = APTStrategy;