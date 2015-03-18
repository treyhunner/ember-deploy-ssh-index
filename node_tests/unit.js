/* jshint node: true */
'use strict';

var assert = require('assert');
var CoreObject = require('core-object');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var proxyquire = require('proxyquire');
var MockUI = require('ember-cli/tests/helpers/mock-ui');

var MockClient = function () { };

inherits(MockClient, EventEmitter);

MockClient.prototype.connect = function () {
  throw Error("TODO Do something");
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

suite('list', function () {

  setup(function() {
    adapter = new SSHAdapter({
      ui: new MockUI(),
      config: stubConfig,
      taggingAdapter: new MockTaggingAdapter(),
    });
  });

  test('no files', function () {
    console.log(adapter.list());
  });

});
