var vm = require('vm-browserify');
var parseFile = require('test262-parser').parseFile;

module.exports = BrowserRunner;

function Test262Error(message) {
    if (message) this.message = message;
}

Test262Error.prototype.toString = function () {
    return this.message;
};

var autoIncludes = ['assert.js'];

function BrowserRunner(opts) {
    this.opts = opts

    if(opts.prelude) {
        throw new Error('prelude arg not supported yet');

    }

    if(opts.includesDir) {
        console.log('Ignoring includesDir for BrowserRunner');
    }

    this.helpers = loadHelpers(require('../precompilation/helpers.json'));
};

BrowserRunner.prototype.execute = function(test, cb) {
    var contents = test.contents;
    var error;
    var result = {log: []};
    
    var context = {
        $ERROR: function(err) {
            if(typeof err === "object" && err !== null && "name" in err)
                throw err;
            else throw new Test262Error(err);
        },
        $DONE: function(err) {
            error = err;
            result.doneCalled = true;
        },
        $LOG: function(log) {
            result.log.push(log);
        },
        // process: process, 
        Test262Error: Test262Error
    }

    try {
        // vm.runInNewContext(contents, context, {displayErrors: false});
        vm.runInNewContext(contents, context);
    } catch(e) {
        error = e;
    }

    // vm is not async in browser for now
    // process.nextTick(function () {
    if(error) {
        if(typeof error === 'object') {
            // custom thrown errors won't have a name property.
            result.errorName = error.name || "Test262Error";
            result.errorMessage = error.message;
            result.errorStack = error.stack
        } else {
            result.errorName = "Error";
            result.errorMessage = error;
        }
    }

    this.validateResult(test, result);
    cb();
    // }.bind(this));
}

BrowserRunner.prototype.deps = [];

BrowserRunner.prototype.compile = function(test) {
    // add call to $DONE at the bottom of the test file if it's not
    // present.
    if(test.contents.indexOf("$DONE") === -1) {
        // lead with a semicolon to prevent ASI nonsense.
        test.contents += "\n;$DONE();\n"
    }

    this.deps.forEach(function(dep) {
        test.contents = dep + "\n" + test.contents;
    })

    this.link(test);

    if(test.strictMode) {
        test.contents = '"use strict";\n' + test.contents;
    }

}

BrowserRunner.prototype.link = function(test) {
    var runner = this;
    var includeContent = '';
    var included = [];

    if(this.preludeContent) {
        includeContent += this.preludeContent;
    }

    function addIncludesFor(file) {
        file.attrs.includes.forEach(addInclude);
    }

    function addInclude(dep) {
        if(!runner.helpers[dep]) throw new Error('Helper not found: ' + dep);
        if(included.indexOf(dep) > -1) return;

        includeContent += runner.helpers[dep].contents;

        addIncludesFor(runner.helpers[dep]);
    }

    autoIncludes.forEach(addInclude);
    addIncludesFor(test);

    // TODO: Normalize test cases to explicitly include this if needed?
    if(test.contents.indexOf("NotEarlyError") > -1) {
        test.contents = "var NotEarlyError = new Error('NotEarlyError');\n"
                        + test.contents;
    }

    test.contents = includeContent + test.contents;
}

var errorLogRe = /^test262\/error (.*)$/;
// Result is expected to have the following keys:
// errorString: Error of the form ErrorName: ErrorMessage. Optional.
// log: An array of log strings. Optional.
// doneCalled: boolean indicating whether $DONE was called by the test.
// errorName: name of error thrown (if any)
// errorMessage: message from error thrown (used for debugging purposes)
// errorStack: stack trace of error thrown (used for debugging purposes)
BrowserRunner.prototype.validateResult = function(test, result) {
    var expectingStack = false;
    var isNegative = test.attrs.flags.negative || test.attrs.negative;
    // parse result from log
    (result.log || []).forEach(function(log) {
        var errorMatch = log.match(errorLogRe);
        if(errorMatch) {
            result.errorString = errorMatch[1];
            expectingStack = true;
            return;
        }

        if(expectingStack) {
            if(log.match(/^\s+at/)) {
                result.errorStack = result.errorStack || result.errorString + "\n";
                result.errorStack += log + "\n";
                return;
            } else {
                expectingStack = false;
            }
        }

        if(log === "test262/done") {
            result.doneCalled = true;
        }
    })

    // parse errorString if present
    if(result.errorString) {
        result.errorString = result.errorString.trim();
        var match = result.errorString.match(/(\w+): (.*)$/m);
        if(match) {
            result.errorName = match[1];
            result.errorMessage = match[2];
            if(result.errorString.split("\n").length > 1) {
                result.errorStack = "\n" + result.errorString;
            }
        } else {
            result.errorName = result.errorString || null;
        }
    }

    // validate results against expected results
    if(result.errorName) {
        test.errorName = result.errorName;
        test.errorMessage = result.errorMessage;
        test.errorStack = result.errorStack;

        if(isNegative) {
            if(test.attrs.negative) {
                // failure can either match against error name, or an exact match
                // against error message (the latter case is thus far only to support
                // NotEarlyError thrown errors which have an error type of "Error").
                test.pass =
                    !!result.errorName.match(new RegExp(test.attrs.negative)) ||
                    result.errorMessage === test.attrs.negative;
            } else {
                test.pass = true
            }
        } else {
            test.pass = false
        }
    } else {
        // ensure $DONE was called if there wasn't an error reported
        if(!result.doneCalled) {
            test.pass = false;
            test.errorName = "Test262 Error";
            test.errorMessage = "Test did not run to completion ($DONE not called)";
        } else if(isNegative) {
            test.pass = false;
        } else {
            test.pass = true;
        }
    }
}

BrowserRunner.prototype.runBatch = function(batch, done) {
    batch.forEach(function(test) {
        this.compile(test);
    }, this);

    this.executeBatch(batch, done);
}

BrowserRunner.prototype.run = function(test, done) {
    this.compile(test);
    this.execute(test, function() {
        done(null, test);
    });
}

// default no-op
BrowserRunner.prototype.end = function() {};

function loadHelpers(jsonBlob) {
    var helpers = {};
    Object.keys(jsonBlob).forEach(function(elem) {
        helpers[elem] = parseFile({contents: jsonBlob[elem], file: elem});
    })

    return helpers;
}