/**
 * @module language-strategy
 */


// Core/NPM Modules
const Bluebird        = require('bluebird');
const path            = require('path');
const _               = require('lodash');
const child_process   = require('child_process');
const neo4j           = require('neo4j-driver').v1;
const generator       = require('dockerfile-generator');


// Local Modules
const StrategyFactory = require('./strategy-factory');
const logger          = require('./logger');


// Constants
const NOT_IMPLEMENTED = 'not implemented';


// Neo4j Query templates
const RESOURCE_LOOKUP = `
MATCH (r :resource)<-[:resource]-(:version)<-[:version]-(p :package {system: {system}})
WHERE {name} STARTS WITH r.name
RETURN DISTINCT p
UNION
MATCH (p :package {name: {name}, system: {system}})
RETURN DISTINCT p
`;
const RESOURCE_DEP_LOOKUP = `
MATCH (n :package {name: {name}, system: {system}})-[:version]->(:version)-[:resource_dependency]->(:resource)<-[:resource]-(:version)<-[:version]-(d :package)
RETURN DISTINCT d
`;
const ASSOCIATION_DEP_LOOKUP = `
 MATCH (n :package {name: {name}, system: {system}})-[:association]->(e :association)-[:association]->(d :package)
 RETURN DISTINCT d
`;
// const ASSOCIATION_DEP_LOOKUP = `
// MATCH (n :package {name: {name}, system: {system}})-[:association]->(e :association)-[:association]->(d :package)
// WITH n, collect((e)-->(d)) AS associations_collection, avg(e.lift) AS avg_lift, stDev(e.lift) AS lift_std
// UNWIND associations_collection AS associations
// UNWIND associations AS association
// WITH n, avg_lift, lift_std, nodes(association) AS association_nodes
// WITH n, avg_lift, lift_std, association_nodes[0] AS e, association_nodes[1] AS d
// WHERE e.confidence >= 0.8 AND e.lift >= avg_lift + (3 * lift_std)
// WITH n, head(collect(e)) AS e, d
// RETURN DISTINCT d
// `;


/**
 * Language strategy class.
 *
 * @property {String} language         Name of strategy language.
 * @property {String} langpackPath     Path to strategy langpack.
 * @property {Object} langpack         Strategy langpack.
 * @property {String} dependencyParser Path to executable that can be used to parse dependencies.
 */
class LanguageStrategy {

    /**
     * Strategy constructor.
     */
    constructor(options = {}) {
        this.factory = new StrategyFactory();
    }

    /**
     * Perform asynchronous initialization as needed.
     * Returns self for chaining.
     *
     * @returns {Promise.<LanguageStrategy>}
     */
    async initialize() { return this; }

    /**
     * Language name.
     *
     * @returns {String} Language name.
     */
    get language() { throw new Error(NOT_IMPLEMENTED); }

    /**
     * Path to executable dependency parser.
     *
     * @returns {String} Dependency parser path.
     */
    get dependencyParser() { throw new Error(NOT_IMPLEMENTED); }

    /**
     * Docker image name.
     *
     * @returns {String} Docker image name.
     */
    get imageName() { throw new Error(NOT_IMPLEMENTED); }

    /**
     * Docker image version.
     *
     * @returns {String} Docker image version.
     */
    get imageVersion() { throw new Error(NOT_IMPLEMENTED); }

    /**
     * Name for the language's default package management system.
     *
     * @returns {String} Package management system.
     */
    get system() { throw new Error(NOT_IMPLEMENTED); }

    /**
     * Construct a Neo4j driver for connecting to the database.
     */
    getNeo4jDriver() {
        return neo4j.driver('bolt://localhost:7687');
    }

    /**
     * Generate data for building a dockerfile.
     *
     * @param   {Object}           options             Options object.
     * @param   {String}           options.pkg         Path to a code package that will be dockerized.
     * @param   {String}           options.cmd         Docker command object.
     * @param   {String}           options.cmd.command Run command.
     * @param   {String}           options.cmd.args    Command args.
     * @param   {String}           options.only        Only use specific rules for generating dependencies.
     * @returns {Promise.<Object>}                     Metadata containing generated dockerfile.
     */
    async getDockerfileData(options = {}) {

        // Resolve path to package
        options.pkg = path.resolve(options.pkg);

        // Perform inference and get resulting object
        let metadata = await this.inferDependencies(options.pkg, { only: options.only });

        // Generate dockerfile data object.
        let dockerfileData = _.omitBy({
            imagename: this.imageName,
            imageversion: this.imageVersion,
            cmd: options.cmd || this.getDefaultDockerCommand(options.pkg),
            run: await this.getRunInstallDependencies(metadata.dependencies),
            copy: [ await this.getDefaultCopyCommand(options.pkg) ]
        }, _.isUndefined);

        // Generate dockerfile text from data object
        let dockerfile = await Bluebird.fromCallback(
            cb => generator.generate(JSON.stringify(dockerfileData), cb)
        );

        // Generate install commands
        let installCommands = _.map(
            dockerfileData.run,
            c => `${c.command} ${c.args.join(' ')}`
        ).join(',');

        // Add to metadata
        metadata.dockerfileData = dockerfileData;
        metadata.dockerfile = dockerfile;
        metadata.installCommands = installCommands;

        // Return metadata
        return metadata;

    }

    /**
     * Parse package dependencies.
     *
     * @param   {String}           pkg Path to package to parse.
     * @returns {Promise.<Object>}     JSON dependency object.
     */
    async parsePackageDependencies(pkg) {

        // Parse file and get dependencies
        let stdout = await Bluebird.fromCallback(cb => child_process.execFile(
            this.dependencyParser, [path.resolve(pkg)], cb
        ));
        return JSON.parse(stdout);

    }

    /**
     * Perform dependency inference.
     *
     * Returns a metadata object containing information about the inference procedure and a final list of inferred packages.
     *
     * @param   {String}           pkg          Path to code package or snippet.
     * @param   {Object}           options      Options object.
     * @param   {'assoc'|'deps'}   options.only Only use association rules or dependency rules. Both used if not specified.
     * @returns {Promise.<Object>}              Metadata object.
     */
    async inferDependencies(pkg, options = {}) {

        // Validate options
        if (options.only && !(options.only === 'assoc' || options.only === 'deps')) {
            throw new Error(`Invalid value for only: '${options.only}.' Must be one of {assoc, deps}.`);
        }

        // Get Neo4j Driver
        let driver = this.getNeo4jDriver();

        // Result object for inference data
        let inferenceData = {
            importedResources: { count: 0, items: [] },
            directDependencies: { count: 0, nameResolutions: 0, items: [] },
            transitiveDependencies: { count: 0, items: [] }
        };

        // Open a context using the Neo4j driver and start performing dependency resolution
        await Bluebird.using(Bluebird.resolve(driver).disposer(driver.close), async (driver) => {

            // Parse package for resources that it depends on
            let data = await this.parsePackageDependencies(pkg);
            inferenceData.packageParseResult = data;

            // Create list of dependencies
            let deps = _.union(..._.map(data, v => v.imports));
            inferenceData.importedResources.items = deps;
            inferenceData.importedResources.count = deps.length;
            logger.info('Package imports the following resources', deps);

            // Define a list to store packages corresponding to resources that are imported
            let importPackages = [];

            // Start mapping each known resource to a package
            await Bluebird.all(_.map(deps, async (d) => {

                // Query parameters
                let params = {name: d, system: this.system};

                // Search the database, looking for any package resources with a substring match
                // and any packages with an exact name match. Union and return distinct packages.
                let results = await driver.session().run(RESOURCE_LOOKUP, params);
                if (!results.records.length) logger.info('Could not perform a reverse package lookup for resource:', d);

                // Push discovered packages to the package queue
                await Bluebird.all(_.map(results.records, async (record) => {

                    // Get package properties
                    let p = record.get('p').properties;
                    logger.info(`Reverse lookup for ${d} matched package:`, p);

                    // Get package management system strategy
                    let system = await this.factory.getSystemStrategy(p.system);

                    // Search for a record match and save
                    let match = await system.searchForExactPackageMatch(p.name);
                    if (match && !_.some(importPackages, match)) {
                        logger.info(`Package ${p.name} resolved by package system as:`, match);
                        inferenceData.directDependencies.nameResolutions++;
                        importPackages.push(match);
                    }
                    else {
                        logger.info('Package system could not find package', p);
                    }

                }));

                // If the package queue does not contain a package with an exact name match,
                // this might just be because of an incomplete database. Defer to the system
                // of record. If found, push to the package queue.
                if (!_.some(importPackages, params)) {
                    logger.info('No exact match in database for resource:', d);
                    let system = await this.factory.getSystemStrategy(this.system);
                    let record = await system.searchForExactPackageMatch(d);
                    if (record) {
                        logger.info(`Package ${d} resolved by package system as:`, record);
                        importPackages.push(record);
                    }
                    else logger.info('No exact match found for resource:', d);
                }
                else {
                    // If an exact name match is already in dependencies, then we've counted it as a name
                    // resolution. Remove it. We only want to count cases where the names do not match.
                    inferenceData.directDependencies.nameResolutions--;
                }

            }));

            logger.info(
                'Imported resources were mapped back to these packages:',
                _.map(importPackages, d => `(${d.name}, ${d.system})`)
            );
            inferenceData.directDependencies.items = _.clone(importPackages); // Modified later, so clone now
            inferenceData.directDependencies.count = importPackages.length;


            // Set of encountered packages during traversal
            let encounteredPackages = new Set();

            // List of package dependencies encountered in order.
            let dependencies = [];

            // Perform DFS to resolve packages and dependencies.
            // This is a reverse topological order if the graph
            // structure is acyclic.
            let root;
            while (root = importPackages.shift()) {

                // Log
                logger.info('Starting DFS rooted from:', root);

                // Perform DFS rooted from this node
                await (async function dfs(node) {

                    // Get node id
                    let system = await this.factory.getSystemStrategy(node.system);
                    let nodeId = `${system.normalizePackageName(node.name)},${node.system}`;

                    // If node has already been encountered, do nothing
                    if (encounteredPackages.has(nodeId)) return;

                    // Set package as encountered
                    logger.info('Exploring node:', node);
                    encounteredPackages.add(nodeId);

                    // Build query. Override default depending on options.
                    let query = `
                        ${RESOURCE_DEP_LOOKUP}
                        UNION
                        ${ASSOCIATION_DEP_LOOKUP}
                    `;
                    if (options.only === 'deps') {
                        query = RESOURCE_DEP_LOOKUP;
                    }
                    if (options.only === 'assoc') {
                        query = ASSOCIATION_DEP_LOOKUP;
                    }

                    // Run query
                    let results = await driver.session().run(query, node);

                    // Parse results and recurse
                    for (let record of results.records) {

                        let dep = record.get('d');
                        let name = dep.properties.name;
                        let system = dep.properties.system;

                        if (!encounteredPackages.has(`${name},${system}`)) {
                            await dfs.bind(this)({name, system});
                        }

                    }

                    // Normalize and add to dependencies
                    let match = await system.searchForExactPackageMatch(node.name);
                    if (match) {
                        logger.info(`Package ${node.name} resolved by package system as:`, match);
                        dependencies.push(match);
                        if (!_.isEqual(root, match)) {
                            inferenceData.transitiveDependencies.count++;
                            inferenceData.transitiveDependencies.items.push(match);
                        }
                    }

                }).bind(this)(root);

            }

            logger.info('Resolved dependency ordering:', _.map(dependencies, d => `(${d.name}, ${d.system})`));
            inferenceData.dependencies = dependencies;

        });

        // Return inference data
        return inferenceData;

    }

    /**
     * Return docker run commands needed to install a list of packages.
     *
     * @param   {Array.<Object>}  packages List of packages.
     * @returns {Promise.<Array>}          List of generated run commands to install dependencies.
     */
    async getRunInstallDependencies(packages) {

        // Map resolved packages to run commands
        return await Bluebird.all(_.map(packages, async (pkg) => {
            let system = await this.factory.getSystemStrategy(pkg.system);
            return system.getInstallRunCommand(pkg);
        }));

    }

    /**
     * Get the default docker command for copying pkg into the Dockerfile.
     *
     * @param {String} pkg Path to package.
     */
    getDefaultCopyCommand(pkg) { throw new Error(NOT_IMPLEMENTED); }

    /**
     * Get the default docker command CMD.
     *
     * @param {String} pkg Path to package.
     */
    getDefaultDockerCommand(pkg) { throw new Error(NOT_IMPLEMENTED); }

}


// Export strategy class
module.exports = LanguageStrategy;