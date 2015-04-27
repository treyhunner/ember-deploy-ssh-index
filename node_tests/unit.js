/* jshint node: true */
'use strict';

var assert = require('assert');
var blanket = require('blanket')();
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

var MockSFTP = function () { };

MockSFTP.prototype.readdir = function (dir, func) {
  assert.equal(dir, stubConfig.remoteDir);
  func(null, fileList);
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
  remoteDir: 'remoteDir',
  privateKeyFile: './node_tests/fixtures/privateKeyFile.txt',
};
var fileList;

suite('list', function () {

  setup(function() {
    adapter = new SSHAdapter({
      ui: new MockUI(),
      config: stubConfig,
      taggingAdapter: new MockTaggingAdapter(),
    });
  });

  test('no files', function () {
    fileList = [];
    adapter.list();
    assert.equal(adapter.ui.output, '');
  });

});
