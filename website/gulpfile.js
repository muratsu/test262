'use strict';

// Gulp and required plugins
var gulp = require('gulp');
var del = require('del');
var sequence = require('gulp-sequence');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var t262Compiler = require('./src/js/t262Compiler');
var fs = require('fs');
var path = require('path');

var es = require('event-stream');

// Move assets over build folder
gulp.task('assets', function() {
    var tasks = [
        // images
        gulp.src('./src/images/*')
            .pipe(gulp.dest('./build/images')),

        gulp.src('./src/metadata/*')
            .pipe(gulp.dest('./build')),

        gulp.src('./src/styles/*')
            .pipe(gulp.dest('./build/styles')),

        gulp.src('./src/*.html')
            .pipe(gulp.dest('./build')),

        gulp.src('./src/test/*')
            .pipe(gulp.dest('./build/test')),
    ]

    return es.concat.apply(null, tasks);
});

// Precompilation stuff
gulp.task('precompilation', function() {
    return gulp.src('../harness/*')
        .pipe(t262Compiler('helpers.json'))
        .pipe(gulp.dest('./src/precompilation'))
})

// Clean everything in build but directory itself and .gitignore
gulp.task('clean', function(cb) {
    del([
        path.join('build', '**'),
        '!build/.gitignore',
        '!build',
        path.join('src/precompilation', '**'),
        '!src/precompilation',
        '!src/precompilation/.gitignore'
    ]).then(function(){
        cb();
    });
});

gulp.task('js', ['precompilation'], function() {
    return browserify('./src/js/index.js')
        .bundle()
        .pipe(source('index.js'))
        .pipe(gulp.dest('./build/js'));
});

// Task for cleaning existing test colleteral
gulp.task('cleantests', function(cb) {
    del([
        path.join('src/test', '**'),
        '!src/test',
        '!src/test/.gitignore'
    ]).then(function(){
        cb();
    })
})

// Builds tests - this will take a while!
gulp.task('tests', ['cleantests'], function() {
    var topFolders = getAllFolders('../test/'),
        subFolders = [];

    // Add parent folders
    var tasks = topFolders.map(function(target) {
        //console.log(path.relative('../test/', target))
        return gulp.src(target + '/*')
            .pipe(t262Compiler(path.relative('../test/', target) + '.json'))
            .pipe(gulp.dest('./src/test'))  
    })

    // Add subfolders
    for (var x = 0; x < topFolders.length; x++) {
        subFolders = subFolders.concat(getAllFolders(topFolders[x]));
    }

    tasks = tasks.concat(subFolders.map(function(target) {
        return gulp.src(target + '/**/*')
            .pipe(t262Compiler(path.relative('../test/', target) + '.json'))
            .pipe(gulp.dest('./src/test'))  
    }))

    // also create an index json
    var allFolders = topFolders.concat(subFolders);
    var contents = "{\n  \"tests\": [\n";
    contents += allFolders.map(function(folder){
        return "    \"" + path.relative('../test/', folder) + ".json\"";
    }).join(",\n");
    contents += "\n  ]\n}\n";
    fs.writeFileSync("src/test/index.json", contents);

    return es.concat.apply(null, tasks);
})

// Build the website
gulp.task('build', sequence('clean', ['assets', 'js']));

gulp.task('default', ['build']);

var getAllFolders = function(dir) {
    var results = [];

    fs.readdirSync(dir).forEach(function(file) {
        file = path.join(dir, file);
        var stat = fs.statSync(file);

        if (stat && stat.isDirectory()) {
            results.push(file);
        }
    });

    return results;
}