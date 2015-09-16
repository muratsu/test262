'use strict';

// Gulp and required plugins
var gulp = require('gulp');
var del = require('del');
var sequence = require('gulp-sequence');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var t262HelperCompiler = require('./src/js/gulpT262HelperCompiler');

var path = require('path');

// Move assets over build folder
gulp.task('assets', function(cb) {
    // images
    gulp.src('./src/images/*')
        .pipe(gulp.dest('./build/images'));

    gulp.src('./src/metadata/*')
        .pipe(gulp.dest('./build'));

    gulp.src('./src/styles/*')
        .pipe(gulp.dest('./build/styles'));

    gulp.src('./src/*.html')
        .pipe(gulp.dest('./build'))

    gulp.src('./src/tests/*')
        .pipe(gulp.dest('./build/tests'));

    cb();
});

// Precompilation stuff
gulp.task('precompilation', function() {
    return gulp.src('./node_modules/test262-harness/lib/helpers/*')
        .pipe(t262HelperCompiler('helpers.json'))
        .pipe(gulp.dest('./src/precompilation'))
})

// Clean everything in build but directory itself and .gitignore
gulp.task('clean', function(cb) {
    del([
        path.join('build', '**'),
        '!.gitignore',
        '!build'
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

// Build the website
gulp.task('build', sequence('clean', ['assets', 'js']));

gulp.task('default', ['build']);