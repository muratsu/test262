var t262 = require('test262-harness');
var browserRunner = require('./browserRunner.js');
var browserReporter = require('./browserReporter.js');
var parser = require('test262-parser');
var scenarios = require('../../node_modules/test262-harness/lib/scenarios');

// iffy didn't work
document.addEventListener('DOMContentLoaded', t262web, false);

var testList = {};

function t262web(){
    t262.useConfig({
        runner: browserRunner,
        threads: 1
    })

    var Runner = t262.loadRunner();

    // Load tests
    // loadTests();
    var contents = require('../test/harness.json');

    var tests = Object.keys(contents).map(function(d) {
        return parser.parseFile({ contents: contents[d], file: d});
    });

    var runner = new Runner(t262.config);

    // fix for proper async
    tests.forEach(function(test) {
        runner.run(test, function(){
            browserReporter(test);
        });        
    })
}

function loadTests() {
    var list = require('../test/index.json').tests;

    list.forEach(function(val) {
        testList[val] = require('test/' + val);
    })
}