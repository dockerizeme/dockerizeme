# Dockerizeme

## On Reproducibility

We have accepted https://github.com/dockerizeme/dockerizeme/pull/3 to 
transition to main/subordinate terms within the gists included in this repo.
Some terms could not be changed due to dependence on external APIs, links, etc.

To see all gists as they were for the ICSE 2019 submission, check out one of
our [releases](https://github.com/dockerizeme/dockerizeme/releases).

## Example (Dashtable)

Dashtable is a Python package for converting tables to different markdown formats. The following example
(`examples/dashtable/snippet.py`) uses Dashtable to convert an HTML table into a gfm table.

```python
import dashtable
print(dashtable.html2md("""
    <table>
        <tr><th>Header 1</th><th>Header 2</th></tr>
        <tr><td>Data 1</td><td>Data 2</td></tr>
    </table>
"""))
```

Attempting to run the code snippet results in an import error

```
$ python snippet.py
Traceback (most recent call last):
  File "snippet.py", line 1, in <module>
    import dashtable
ImportError: No module named dashtable
```

DockerizeMe can build an environment specification for the code snippet as a Dockerfile

```
dockerizeme --verbose snippet.py > Dockerfile
docker build -t dashtable .
```

The inferred environment contains the dependency `dashtable`. It also contains`beautifulsoup4`, an HTML parsing
library that Dashtable relies on for parsing HTML tables. Running the code snippet in the inferred environment prints 
the expected output

```
| Header 1 | Header 2 |
|----------|----------|
|  Data 1  |  Data 2  |
```

## Vagrant

A local Vagrant configuration is provided for convenience.

```
vagrant up
vagrant ssh
```

DockerizeMe can be run on any of the included code snippets through vagrant. For example

```
cd /vagrant/examples/pylibmc
dockerizeme --verbose
```

## Neo4J

DockerizeMe requires Neo4J to be reachable at `bolt://localhost:7687`. It can be started with

```
docker run --name=neo4j -d -p 7474:7474 -p 7687:7687 -v "$(pwd)/neo4j:/data" --env="NEO4J_AUTH=none" --restart-always neo4j
```

The neo4j browser can be accessed at http://localhost:7474/.

To back up a database, stop the container (if applicable) and then run the dump command

```
docker stop neo4j
docker run --rm -it -v "$(pwd)/neo4j:/data" neo4j neo4j-admin dump --to=/data/<filename>
docker start neo4j
```

To restore a database, stop the container (if applicable) and then run the restore command

```
docker stop neo4j
docker run --rm -it -v "$(pwd)/neo4j:/data" neo4j neo4j-admin load --force --from=/data/<filename>
docker start neo4j
```

DockerizeMe provides `neo4j/neo4j.dump`, a database backup containing the DockerizeMe database.

## Usage

If cloning the repo
```
> npm run dockerizeme [-- [args]]
```

If installed globally
```
> dockerizeme [args]
```

As a module
```javascript
const dockerizeme = require('dockerizeme');
(async () => {
    
    let contents = await dockerizeme(cmd, doc);
    console.log(contents);
    
})();
```
