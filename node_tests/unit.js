/* jshint node: true */
'use strict';
require('blanket')();

var assert = require('assert');
var CoreObject = require('core-object');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var proxyquire = require('proxyquire');
var MockUI = require('ember-cli/tests/helpers/mock-ui');

var MockClient = function () {
  this.config = stubConfig;
};

inherits(MockClient, EventEmitter);

MockClient.prototype.connect = function (config) {
  assert.equal(config.host, this.config.host);
  assert.equal(config.username, this.config.username);
  this.emit('ready');
};

MockClient.prototype.end = function () {
};

MockClient.prototype.sftp = function (func) {
  func(null, new MockSFTP());
};

var MockStream = function () {
  this.config = stubConfig;
};

inherits(MockStream, EventEmitter);

MockStream.prototype.write = function (value) {
  assert.equal(value, fileContents);
  this.emit('finish');
};

var MockSFTP = function () { };

MockSFTP.prototype.createWriteStream = function (filename) {
  assert.equal(filename, filePath);
  return new MockStream();
};

MockSFTP.prototype.readdir = function (dir, func) {
  assert.equal(dir, stubConfig.remoteDir);
  func(null, fileList);
};

MockSFTP.prototype.unlink = function (file, func) {
  func(null);
};

MockSFTP.prototype.symlink = function (file, func) {
  func(null);
};

var mockSSH2 = {
  Client: MockClient,
};

var MockTaggingAdapter = CoreObject.extend({
  createTag: function() {
    return '000000';
  },
});

var SSHAdapter = proxyquire('../lib/ssh-adapter', {
  'ssh2': mockSSH2,
});
var adapter;
var stubConfig = {
  host: 'host',
  username: 'username',
  remoteDir: 'remoteDir/',
  privateKeyFile: './node_tests/fixtures/privateKeyFile.txt',
};
var fileContents;
var filePath = 'remoteDir/000000.html';
var fileList;

suite('list', function () {

  setup(function() {
    adapter = new SSHAdapter({
      ui: new MockUI(),
      config: stubConfig,
      taggingAdapter: new MockTaggingAdapter(),
    });
  });

  test('no files', function (done) {
    fileList = [];
    adapter.list().then(function () {
      assert.equal(adapter.ui.output, '\nFound the following revisions:\n\n\n\n');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

  test('one file', function (done) {
    fileList = [{
      filename: 'somerev.html',
      attrs: {mtime: new Date()},
    }];
    adapter.list().then(function () {
      assert.equal(adapter.ui.output, '\nFound the following revisions:\n\nsomerev\n\n');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

  test('index file', function (done) {
    fileList = [{
      filename: 'file.html',
      attrs: {mtime: new Date()},
    }, {
      filename: 'index.html',
      attrs: {mtime: new Date()},
    }];
    adapter.list().then(function () {
      assert.equal(adapter.ui.output, '\nFound the following revisions:\n\nfile\n\n');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

  test('multiple files', function (done) {
    fileList = [{
      filename: 'file1.html',
      attrs: {mtime: new Date(2000, 1, 2)},
    }, {
      filename: 'file2.html',
      attrs: {mtime: new Date(2000, 1, 3)},
    }, {
      filename: 'file3.html',
      attrs: {mtime: new Date(2000, 1, 1)},
    }];
    adapter.list().then(function () {
      assert.equal(adapter.ui.output, '\nFound the following revisions:\n\nfile2\nfile1\nfile3\n\n');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

});

suite('upload', function () {

  setup(function() {
    adapter = new SSHAdapter({
      ui: new MockUI(),
      config: stubConfig,
      taggingAdapter: new MockTaggingAdapter(),
    });
    fileContents = 'file contents';
  });

  test('already uploaded', function (done) {
    fileList = [{
      filename: '000000.html',
      attrs: {mtime: new Date()},
    }];
    adapter.upload(fileContents).catch(function (error) {
      assert.equal(error.name, 'SilentError');
      assert.equal(error.message, 'Revision already uploaded.');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

  test('successful', function (done) {
    fileList = [{
      filename: '000001.html',
      attrs: {mtime: new Date()},
    }];
    adapter.upload(fileContents).then(function () {
      assert.equal(adapter.ui.output, '');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

});
