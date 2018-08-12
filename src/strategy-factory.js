/**
 * @module strategy-factory
 */


// Local Modules
const logger = require('./logger');


/**
 * StrategyFactory class
 */
class StrategyFactory {

    /**
     * Construct a new factory.
     */
    constructor() {
        this.strategies = new Map();
        this.systems = new Map();
    }

    /**
     * Get a new language strategy.
     *
     * @param   {String}                     language Language of the strategy to return.
     * @returns {Promise.<LanguageStrategy>}          Strategy for given language.
     */
    async getLanguageStrategy(language) {

        try {

            // Load and init if not already available
            if (!(language in this.strategies)) {
                let Strategy = require(`./languages/${language}/strategy`);
                this.strategies[language] = await (new Strategy()).initialize();
            }

            // Return
            return this.strategies[language];

        }
        catch(err) {

            logger.error(`Unable to load strategy for language ${language}:`, err.message);
            throw new Error(`Language '${language}' not supported.`);

        }

    }

    /**
     * Get a new system strategy.
     *
     * @param   {String}                   system Language of the strategy to return.
     * @returns {Promise.<SystemStrategy>}        Strategy for given language.
     */
    async getSystemStrategy(system) {

        try {

            // Load and init if not already available
            if (!(system in this.systems)) {
                let System = require(`./systems/${system}/strategy`);
                this.systems[system] = await (new System()).initialize();
            }

            // Return
            return this.systems[system];

        }
        catch(err) {

            logger.error(`Unable to load strategy for system ${system}:`, err.message);
            throw new Error(`System '${system}' not supported.`);

        }

    }

}


// Export factory class
module.exports = StrategyFactory;