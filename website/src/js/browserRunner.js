var vm = require('vm-browserify');

module.exports = BrowserRunner;

var autoIncludes = ['assert.js'];

function BrowserRunner(args) {
    // Handle helpers later
    this.helpers = [];
}

BrowserRunner.prototype.deps = [];

BrowserRunner.prototype.run = function(test, done) {
    this.compile(test);
    res = vm.runInNewContext(test);
    done(null, res);
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

BrowserRunner.prototype.validateResult = function(test, result) {
    
}

// no-op
BrowserRunner.prototype.end = function() {};