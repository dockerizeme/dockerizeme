/**
 * @module system-strategy
 */


// Constants
const NOT_IMPLEMENTED = 'not implemented';


/**
 * System strategy class.
 *
 * @property {String} system System name.
 */
class SystemStrategy {

    /**
     * Peform async initialization, as needed.
     * Returns self for chaining.
     *
     * @returns {Promise<SystemStrategy>}
     */
    async initialize() { return this; }

    /**
     * System name.
     *
     * @returns {String} System name.
     */
    get system() { throw new Error(NOT_IMPLEMENTED); }

    /**
     * Get a system specific command for installing a package.
     *
     * @param   {Object} pkg Package to install.
     * @returns {Object}     Docker run command to install a package `name` at `version`.
     */
    getInstallRunCommand(pkg) { throw new Error(NOT_IMPLEMENTED); }

    /**
     * Normalize a package name. Default is to do nothing. Some systems
     * may override this if they are case insensitive, allow multiple
     * separators, etc.
     *
     * @param   {String} pkg Package name.
     * @returns {String}     Normalized package name.
     */
    normalizePackageName(pkg) { return pkg; }

    /**
     * Search for a package exactly matching a name using
     * the strategy system implementation. Some implementations
     * may perform a case insensitive match for correctness
     *
     * @param {String} pkg Package name.
     */
    async searchForExactPackageMatch(pkg) { throw new Error(NOT_IMPLEMENTED); }

}


// Export
module.exports = SystemStrategy;