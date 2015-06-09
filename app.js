var glob = require("glob"),
    Q = require("q"),
    fs = require('fs');


console.log(process.cwd());
var program = new Program();
program.run();

function Program() {
    "use strict";

    var self = this,
        outputFile,
        filesToInject = [],
        textToInject,
        template,
        end,
        start;

    var commands = {
        output: 'OUTPUT',
        files: 'FILES',
        template: 'TEMPLATE',
        start: 'START',
        end: 'END'
    };

    var options = {
        '-o' : commands.output,
        '--output': commands.output,
        '-f': commands.files,
        '--files': commands.files,
        '-t': commands.template,
        '--template': commands.template,
    };

    function processArguments() {
        console.log("Processing Arguments");
        var prevCommand = null;
        var promises = [];
        for(var i = 2; i < process.argv.length; i++) {
            var arg = process.argv[i];
            if(options[arg]) {
                prevCommand = options[arg];
            } else if (prevCommand){
                switch(prevCommand) {
                    case commands.output:
                        outputFile = arg;
                        break;
                    case commands.files:
                        promises.push(addFile(arg));
                        break;
                    case commands.template:
                        template = arg;
                        break;
                }
            }
        }

        return Q.all(promises);
    }

    function addFile(filepath) {
        var defer = Q.defer();
        console.log('Looking for files at ' + filepath);
        glob(filepath, function (err, files) {
            if(err) {
                throw 'Error processing file names: ' + err;
            }

            console.log('Found ' + files.length + ' at ' + filepath);
            filesToInject = filesToInject.concat(files);

            defer.resolve();
        });

        return defer.promise;
    }

    function getTextToInject() {
        var text = '';
        for(var i = 0; i < filesToInject.length; i++) {
            text += template.replace('{{file}}', filesToInject[i]) + '\r\n';
        }

        return text;
    }

    function writeToFile() {
        console.log("Reading contents of " + outputFile);
        fs.readFile(outputFile, 'utf8', function (err, data) {
            if (err) {
                throw 'Error: cannot open output file ' + outputFile + ' ' + err;
            }

            var regex = /(.*injector:start.*)[\s\S]*?(.*injector:end.*)/g;
            var match = regex.exec(data);
            var result = data.replace(regex, match[1] + '\r\n' + textToInject + match[2]);

            console.log("Writing changes to " + outputFile);
            fs.writeFile(outputFile, result, 'utf8', function (err) {
                if (err) {
                    throw 'Error: cannot write to output file ' + outputFile + ' ' + err;
                }

                console.log("Changes written to " + outputFile);

                Q.when();
            });
        });
    }

    function generateTextToInject() {
        console.log("Found " + filesToInject.length + " Files Total");
        textToInject = getTextToInject();
        return Q.when();
    }

    self.run = function () {
        processArguments()
            .then(generateTextToInject)
            .then(writeToFile);
    }
}
