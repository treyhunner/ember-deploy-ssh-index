/* jshint node: true */
'use strict';
require('blanket')();

var assert = require('assert');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var proxyquire = require('proxyquire');
var mockUi = {
  messages: [],
  write: function() {},
  writeLine: function(message) {
    this.messages.push(message);
  }
};
var stubConfig = {
  host: 'host',
  username: 'username',
  remoteDir: 'remoteDir/',
  keyPrefix: 'project-name',
  revisionKey: '000000',
  privateKeyFile: './node_tests/fixtures/privateKeyFile.txt',
  password: 'password123'
};
var mockPlugin = {
  ui: mockUi,
  readConfig: function(propertyName) {
    return stubConfig[propertyName];
  },
  log: function(message/*, opts*/) {
    this.ui.write('|    ');
    this.ui.writeLine('- ' + message);
  }
};
var adapter;
var fileContents;
var filePath = 'remoteDir/project-name:000000.html';
var activeFile;
var fileList;
var unlinkedFile;
var linkedFile;
var existingFile;

var MockClient, MockStream, MockSFTP;

MockClient = function () {
  this.config = stubConfig;
};

inherits(MockClient, EventEmitter);

MockClient.prototype.connect = function (config) {
  assert.equal(config.host, this.config.host);
  assert.equal(config.username, this.config.username);
  assert.equal(config.password, this.config.password);
  this.emit('ready');
};

MockClient.prototype.end = function () {
};

MockClient.prototype.sftp = function (func) {
  func(null, new MockSFTP());
};

MockStream = function () {
  this.config = stubConfig;
};

inherits(MockStream, EventEmitter);

MockStream.prototype.write = function (value) {
  assert.equal(value, fileContents);
  this.emit('finish');
};

MockSFTP = function () { };

MockSFTP.prototype.createWriteStream = function (filename) {
  assert.equal(filename, filePath);
  return new MockStream();
};

MockSFTP.prototype.readdir = function (dir, func) {
  assert.equal(dir, stubConfig.remoteDir);
  func(null, fileList);
};

MockSFTP.prototype.readlink = function (file, func) {
  assert.equal(file, stubConfig.remoteDir + 'index.html');
  func(null, activeFile);
};

MockSFTP.prototype.exists = function (file, func) {
  func(file === existingFile);
};

MockSFTP.prototype.unlink = function (file, func) {
  if (unlinkedFile) {
    assert.equal(file, unlinkedFile);
    func(null);
  } else {
    func(new Error('Cannot unlink'));
  }
};

MockSFTP.prototype.symlink = function (source, destination, func) {
  assert.equal(source, linkedFile.source);
  assert.equal(destination, linkedFile.destination);
  func(null);
};

var mockSSH2 = {
  Client: MockClient,
};

var SSHAdapter = proxyquire('../lib/ssh-adapter', {
  'ssh2': mockSSH2,
});


suite('list', function () {

  setup(function() {
    adapter = new SSHAdapter({
      plugin: mockPlugin,
    });
  });

  test('no files', function (done) {
    fileList = [];
    adapter.fetchRevisions().then(function (revisions) {
      assert.equal(revisions.length, 0);
      done();
    }).catch(function (error) {
      done(error);
    });
  });

  test('one file', function (done) {
    fileList = [{
      filename: 'project-name:somerev.html',
      attrs: {mtime: new Date()},
    }];
    adapter.fetchRevisions().then(function (revisions) {
      assert.equal(revisions.length, 1);
      assert.equal(revisions[0].revision, 'somerev');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

  test('index file', function (done) {
    fileList = [{
      filename: 'project-name:file.html',
      attrs: {mtime: new Date()},
    }, {
      filename: 'index.html',
      attrs: {mtime: new Date()},
    }];
    adapter.fetchRevisions().then(function (revisions) {
      assert.equal(revisions.length, 1);
      assert.equal(revisions[0].revision, 'file');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

  test('multiple files', function (done) {
    fileList = [{
      filename: 'project-name:file1.html',
      attrs: {mtime: new Date(2000, 1, 2)},
    }, {
      filename: 'project-name:file2.html',
      attrs: {mtime: new Date(2000, 1, 3)},
    }, {
      filename: 'project-name:file3.html',
      attrs: {mtime: new Date(2000, 1, 1)},
    }];
    adapter.fetchRevisions().then(function (revisions) {
      assert.equal(revisions.length, 3);
      assert.equal(revisions[0].revision, 'file2');
      assert.equal(revisions[1].revision, 'file1');
      assert.equal(revisions[2].revision, 'file3');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

  test('non-revision files', function (done) {
    fileList = [{
      filename: 'non-revision.html',
      attrs: {mtime: new Date()},
    }, {
      filename: 'project-name:image.png',
      attrs: {mtime: new Date()},
    }, {
      filename: 'project-name:real-revision.html',
      attrs: {mtime: new Date()},
    }];
    adapter.fetchRevisions().then(function (revisions) {
      assert.equal(revisions.length, 1);
      assert.equal(revisions[0].revision, 'real-revision');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

  test('active revision', function (done) {
    fileList = [{
      filename: 'project-name:rev1.html',
      attrs: {mtime: new Date(2000, 1, 2)},
    }, {
      filename: 'project-name:rev2.html',
      attrs: {mtime: new Date(2000, 1, 1)},
    }, {
      filename: 'index.html',
      attrs: {mtime: new Date()},
    }];
    activeFile = '/remoteDir/project-name:rev1.html';
    adapter.fetchRevisions().then(function (revisions) {
      assert.equal(revisions.length, 2);
      assert.equal(revisions[0].revision, 'rev1');
      assert.equal(revisions[0].active, true);
      assert.equal(revisions[1].revision, 'rev2');
      assert.equal(revisions[1].active, false);
      done();
    }).catch(function (error) {
      done(error);
    });
  });
});

suite('upload', function () {

  setup(function() {
    adapter = new SSHAdapter({
      plugin: mockPlugin,
    });
    fileContents = 'file contents';
  });

  test('already uploaded', function (done) {
    fileList = [{
      filename: 'project-name:000000.html',
      attrs: {mtime: new Date()},
    }];
    adapter.upload(fileContents).catch(function (error) {
      assert.equal(error, 'Revision already uploaded.');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

  test('successful', function (done) {
    fileList = [{
      filename: 'project-name:000001.html',
      attrs: {mtime: new Date()},
    }];
    adapter.upload(fileContents).then(function (key) {
      assert.equal(key, 'project-name:000000');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

});


suite('activate', function () {

  setup(function() {
    adapter = new SSHAdapter({
      plugin: mockPlugin,
    });
    existingFile = 'remoteDir/index.html';
    unlinkedFile = 'remoteDir/index.html';
    linkedFile = {
      source: 'remoteDir/project-name:000000.html',
      destination: 'remoteDir/index.html',
    };
  });

  test('missing revision', function (done) {
    fileList = [{
      filename: 'project-name:000000.html',
      attrs: {mtime: new Date()},
    }];
    adapter.activate('000001').catch(function (error) {
      assert.equal(error, 'Revision doesn\'t exist');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

  test('no index.html', function (done) {
    unlinkedFile = '';
    existingFile = '';
    fileList = [{
      filename: 'project-name:000000.html',
      attrs: {mtime: new Date()},
    }];
    adapter.activate('000000').then(function (output) {
      assert.equal(output.revisionData.activatedRevisionKey, '000000');
      done();
    }).catch(function (error) {
      done(error);
    });
  });

  test('successfully', function (done) {
    fileList = [{
      filename: 'project-name:000000.html',
      attrs: {mtime: new Date()},
    }];
    adapter.activate('000000').then(function (output) {
      assert.equal(output.revisionData.activatedRevisionKey, '000000');
      done();
    }).catch(function (error) {
      done(error);
    });
  });
});
