var t262 = require('test262-harness');
var browserRunner = require('./browserRunner.js');
var browserReporter = require('./browserReporter.js');
var parser = require('test262-parser');
var _ = require('highland');

// iffy didn't work
document.addEventListener('DOMContentLoaded', t262web, false);

function t262web(){
    t262.useConfig({
        runner: browserRunner
    })

    var Runner = t262.loadRunner();

    // Temp hack to create a stream of tests
    var contents = _(require('../tests/test.json').tests);

    var tests = contents.map(function(d) {
        return parser.parseFile(d);
    });

    // Create runner
    var runner = new Runner(t262.config);

    var results = tests.map(function(test) {
        return _(function(push) {
           runner.run(test, function() {
                push(null, test);
                push(null, _.nil);
            });
       });
    }).sequence();

    results.on('end', function() {
        runner.end();
    });

    results.pipe(browserReporter);

    console.log(runner);
    console.log(tests);
}