#!/usr/bin/env node

/**
 * Run dockerize against a language pack.
 *
 * @module dockerize/bin
 */


// Modules
const yargs     = require('yargs');
const _         = require('lodash');
const dockerize = require('./index');
const logger    = require('./logger');


// Dockerize
(async () => {

    try {

        yargs.command(
            '* [package]',
            'Dockerize a package',
            (yargs) => {

                yargs.option('language', {
                    type: 'string',
                    describe: 'Specify language',
                    default: 'python'
                });

                yargs.option('cmd', {
                    type: 'string',
                    describe: 'CMD executable for the final Dockerfile.'
                });

                yargs.option('arg', {
                    type: 'array',
                    describe: 'CMD arguments for the final Dockerfile.'
                });

                yargs.option('format', {
                    type: 'string',
                    describe: 'Output format: either a valid dockerfile, a semicolon delimited list of install commands, or JSON metadata about inference.',
                    default: 'dockerfile',
                    choices: ['dockerfile', 'install-commands', 'metadata']
                });

                yargs.option('verbose', {
                    type: 'boolean',
                    describe: 'Enable logging to stderr.',
                    default: false
                });

                yargs.option('only', {
                    type: 'string',
                    describe: 'Rules to use for transitive dependency resolution.',
                    choices: ['deps', 'assoc']
                });

                yargs.positional('package', {
                    type: 'string',
                    describe: 'Path to the code package to be dockerized. Can be relative to cwd.',
                    default: '.'
                });

            }
        );
        yargs.wrap(yargs.terminalWidth());
        yargs.help();
        let argv = yargs.argv;

        // If verbose, enable logging
        if (argv.verbose) {
            logger.level = 'silly';
            logger.info('Verbose mode enabled. Logging to stderr.');
        }

        // Get command
        let cmd;
        if (argv.cmd) {
            cmd = _.omitBy({
                command: argv.cmd,
                args: _.isArray(argv.arg) ? argv.arg : [ argv.arg ]
            }, _.isUndefined);
        }

        // Get language, package name, and version
        let language = argv.language;
        let only = argv.only;
        let pkg = argv.package;
        let format = argv.format;

        // Dockerize
        let contents = await dockerize(_.omitBy({
            pkg,
            language,
            cmd,
            format,
            only
        }, _.isUndefined));

        // Print
        if (_.isObject(contents)) {
            console.log(JSON.stringify(contents, null, 4));
        }
        else {
            console.log(contents);
        }

    }
    catch(e) {
        logger.error(e);
        process.exit(1);
    }

})();
