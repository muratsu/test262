var t262 = require('test262-harness');
var browserRunner = require('./browserRunner.js');
var browserReporter = require('./browserReporter.js');
var parser = require('test262-parser');
var _ = require('highland');
var scenarios = require('../../node_modules/test262-harness/lib/scenarios');
var Tributary = require('stream-bifurcate');

// iffy didn't work
document.addEventListener('DOMContentLoaded', t262web, false);

function t262web(){
    t262.useConfig({
        runner: browserRunner,
        threads: 1
    })

    var Runner = t262.loadRunner();

    // Temp hack to create a stream of tests
    var contents = _(require('../tests/test.json').tests);

    var tests = contents.map(function(d) {
        console.log('parsing test');
        return parser.parseFile(d);
    });

    var scenarioStream = getScenarioStream(t262.config);
    var scenarios = tests.flatMap(scenarioStream);

    var trb = scenarios.pipe(new Tributary());
    var results = _(function(push) {
        for(var i = 0; i < t262.config.threads; i++) push(null, run(Runner, t262.config, trb.fork()));
        push(null, _.nil);
    }).merge();

    results.pipe(browserReporter);

    console.log(runner);
    console.log(tests);
}

// takes a test and returns a stream of all the scenarios
function getScenarioStream(config) {
    return function(test) {
        var iter = scenarios(config)(test);
        return _(function(push) {
            var rec = iter.next();
            while(!rec.done) {
                push(null, rec.value);
                rec = iter.next();
            }

            push(null, _.nil);
        })
    }
}

// takes a test collateral stream.
// Returns test results stream.
function run(Runner, config, tests) {
    var runner = new Runner(config);

    console.log(tests);

    var results = _(tests).map(function(test) {
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

    return results;
}