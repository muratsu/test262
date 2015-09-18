'use strict';

var through = require('through2');
var path = require('path');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = gutil.File;

module.exports = function(file) {
  if (!file) {
    throw new PluginError('t262Compiler', 'Missing file option for t262Compiler');
  }

  var latestFile;
  var latestMod;
  var fileName;
  var compiler;

  if (typeof file === 'string') {
    fileName = file;
  } else if (typeof file.path === 'string') {
    fileName = path.basename(file.path);
  } else {
    throw new PluginError('t262Compiler', 'Missing path in file options for t262Compiler');
  }

  function bufferContents(file, enc, cb) {
    // ignore empty files
    if (file.isNull()) {
      cb();
      return;
    }

    // no streams 
    if (file.isStream()) {
      this.emit('error', new PluginError('t262Compiler',  'Streaming not supported'));
      cb();
      return;
    }

    if (!latestMod || file.stat && file.stat.mtime > latestMod) {
      latestFile = file;
      latestMod = file.stat && file.stat.mtime;
    }

    if (!compiler) {
      compiler = new Compiler(fileName);
    }

    compiler.add(file.relative, file.contents);
    cb();
  }

  function endStream(cb) {
    // no files passed in, no file goes out
    if (!latestFile || !compiler) {
      cb();
      return;
    }

    var joinedFile;

    // if file opt was a file path
    // clone everything from the latest file
    if (typeof file === 'string') {
      joinedFile = latestFile.clone({contents: false});
      joinedFile.path = path.join(latestFile.base, file);
    } else {
      joinedFile = new File(file);
    }

    joinedFile.contents = compiler.content;

    this.push(joinedFile);
    cb();
  }

  return through.obj(bufferContents, endStream);
};

function Compiler() {
  this.contentParts = [];
}

Compiler.prototype.add = function(relPath, content) {
  // Check if initial buffer is there
  var emptyParts = this.contentParts.length === 0;

  // Convert content to string if it's buffer
  if (Buffer.isBuffer(content)) content = content.toString();

  // escape forwards shashes  
  content = content.replace(/\\/g, '\\\\');
  
  // escape "s  
  content = content.replace(/([^"\\]*(?:\\.[^"\\]*)*)"/g, '$1\\"');

  // fit everything in one line
  content = content.replace(/\r?\n/g, "\\n");

  var item;

  if (emptyParts) {
    item = '{\n    "' + relPath + '" : "' + content + '"';
  } else {
    item = ',\n    "' + relPath + '" : "' + content + '"'
  }

  this.contentParts.push(new Buffer(item));
}

Object.defineProperty(Compiler.prototype, 'content', {
  get: function content() {
    this.contentParts.push(new Buffer('\n}'));
    return Buffer.concat(this.contentParts);
  }
});
