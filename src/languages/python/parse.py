#!/usr/bin/env python2

"""Parse python scripts.

See https://greentreesnakes.readthedocs.io/en/latest/ for wonderful
documentation on python ast parsing.
"""


# Imports
from __future__ import with_statement
import ast
import getopt
import json
import os
import sys
from visitor import ParserVisitor

# Constants
BASE_PATH = os.path.dirname(os.path.abspath(__file__))


def parse_method_call_tokens(snippet):
    """Parse method call tokens.

    Use the ast package to parse method call tokens from a snippet of python.

    Parameters
    ----------
    snippet : string
        Snippet of python code.

    Returns
    -------
    dict
        JSON serializable dictionary containing the following keys

        imports - All imports made by the parsed snippet
        calls   - All method calls made by the parsed snippet, traced back to its
                  associated library if possible.
    """

    try:
        # Parse snippet into an abstract syntax tree
        tree = ast.parse(str(snippet))

        # Parse the ast
        visitor = ParserVisitor()
        visitor.visit(tree)

        # Get imports and calls
        imports = list(visitor.import_libraries)
        calls = list(visitor.calls)
    except SyntaxError:
        imports = []
        calls = []

    # Return
    return {'imports': imports, 'calls': calls}


def parse_file(filename):
    """Load and parse a file.

    Parameters
    ----------
    filename : string
        Filename or path relative to parse.py.

    Returns
    -------
    dict
        JSON serializable dictionary containing the following keys

        imports - All imports made by the parsed snippet
        calls   - All method calls made by the parsed snippet, traced back to its
                  associated library if possible.
    """

    # Tokenize
    with open(os.path.abspath(filename), 'r') as input_file:
        return parse_method_call_tokens(input_file.read())


def main():
    """Main function.

    This function parses command line arguments for parameters.
    If no file is provided, it will parse example.py.

    Usage
    -----
    python parse.py <filename>
    """

    # Get command line arguments
    opts, args = getopt.getopt(sys.argv[1:], '', [])

    # Generate absolute path name
    if not args:
        raise Exception('Usage: python parse.py <filename>')
    pathname = os.path.abspath(args[0])

    # Import data
    data = {}

    # If pathname is a directory, iterate over all top level python files
    if os.path.isdir(pathname):
        for filename in os.listdir(pathname):
            filename = os.path.join(pathname, filename)
            fname, fext = os.path.splitext(filename)
            if os.path.isfile(filename) and fext == '.py':
                data[filename] = parse_file(filename)
    # If pathname is a file, attempt to parse it
    elif os.path.isfile(pathname):
        data[pathname] = parse_file(pathname)
    else:
        print("{} is not a directory or file.".format(pathname))

    # Print to stdout
    print(json.dumps(data))


# If name is main, run main func
if __name__ == '__main__':
    main()
