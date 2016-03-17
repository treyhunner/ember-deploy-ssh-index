/* jshint node: true */
'use strict';
var CoreObject = require('core-object');
var Promise = require('ember-cli/lib/ext/promise');
var ssh2 = require('ssh2');

module.exports = CoreObject.extend({
  init: function(options) {
    CoreObject.prototype.init.apply(this, arguments);

    this._plugin = options.plugin;
    this._client = new ssh2.Client();
  },

  activate: function(revision) {
    var plugin = this._plugin;
    return this._getFileList()
    .then(this._excludeCurrentRevisionFile.bind(this))
    .then(this._getRevisions.bind(this))
    .then(this._activateRevision.bind(this, revision))
    .then(function(){
      plugin.log('✔  ' + revision + ' => index.html');
      return {
        revisionData: {
          activatedRevisionKey: revision
        }
      };
    });
  },

  upload: function(buffer) {
    var revisionKey = this._plugin.readConfig('revisionKey');
    return this._uploadIfMissing(buffer, revisionKey);
  },

  fetchRevisions: function() {
    return this._getFileList()
    .then(this._sortFileList.bind(this))
    .then(this._excludeCurrentRevisionFile.bind(this))
    .then(this._getRevisions.bind(this));
  },

  _getFileList: function() {
    var conn = this._client;
    var remoteDir = this._plugin.readConfig('remoteDir');
    var connectionOptions = this._getConnectionOptions.bind(this)();

    return new Promise(function (resolve, reject) {
      conn.on('ready', function () {
        conn.sftp(function(err, sftp) {
          if (err) {
            throw err;
          }
          sftp.readdir(remoteDir, function(err, list) {
            if (err) {
              reject(err);
            } else {
              sftp.readlink(remoteDir + 'index.html', function(err, link) {
                conn.end();
                var activatedRevision = link &&
                  link.substring(link.lastIndexOf('/') + 1);
                resolve(list.map(function(file) {
                  file.active = (file.filename === activatedRevision);
                  return file;
                }));
              });
            }
          });
        });
      }).on('error', function (error) {
        reject(error);
      }).connect(connectionOptions);
    });
  },

  _sortFileList: function(fileList) {
    return fileList.sort(function(a, b) {
      return b.attrs.mtime - a.attrs.mtime;
    });
  },

  _getRevisions: function(files) {
    var keyPrefix = this._plugin.readConfig('keyPrefix');
    return files.map(function(file) {
      var start = keyPrefix ? keyPrefix.length + 1 : 0;
      return {
        revision: file.filename.substring(start, (file.filename.length - 5)),
        timestamp: new Date(file.attrs.mtime * 1000),
        active: file.active
      };
    });
  },

  _excludeCurrentRevisionFile: function(data) {
    var keyPrefix = this._plugin.readConfig('keyPrefix');
    return data.filter(function (file) {
      return file.filename.substring(file.filename.length - 5) === '.html' &&
        (!keyPrefix ||
          file.filename.substring(0, keyPrefix.length) === keyPrefix);
    });
  },

  _activateRevision: function (targetRevision, revisions) {
    var keyPrefix = this._plugin.readConfig('keyPrefix');

    var revisionKeys = revisions.map(function(element) {
      return element.revision;
    });
    if (revisionKeys.indexOf(targetRevision) > -1) {
      var conn = this._client;
      var remoteDir = this._plugin.readConfig('remoteDir');
      var connectionOptions = this._getConnectionOptions.bind(this)();
      var prefix = keyPrefix ? keyPrefix + ':' : '';
      var revisionFile = remoteDir + prefix + targetRevision + '.html';
      var indexFile = remoteDir + 'index.html';

      return new Promise(function (resolve, reject) {
        conn.on('ready', function () {
          conn.sftp(function(err, sftp) {
            if (err) {
              throw err;
            }
            resolve({conn: conn, sftp: sftp});
          });
        }).on('error', function (error) {
          reject(error);
        }).connect(connectionOptions);
      }).then(function(hash) {
        return new Promise(function (resolve, reject) {
          hash.sftp.unlink(indexFile, function (err) {
            if (err) {
              // Check if the file still exists
              hash.sftp.exists(indexFile, function (indexExists) {
                if (indexExists) {
                  reject(err);
                } else {
                  // file doesn't exist so should be okay
                  resolve(hash);
                }
              });
            }
            resolve(hash);
          });
        });
      }).then(function(hash) {
        return new Promise(function (resolve, reject) {
          hash.sftp.symlink(revisionFile, indexFile, function(err) {
            if (err) {
              reject(err);
            } else {
              hash.conn.end();
              resolve();
            }
          });
        });
      });
    } else {
      return this._printErrorMessage('Revision doesn\'t exist');
    }
  },

  _uploadIfMissing: function(value, revisionKey) {
    var keyPrefix = this._plugin.readConfig('keyPrefix');
    var key = (keyPrefix ? keyPrefix + ':' : '') + revisionKey;

    var conn = this._client;
    var plugin = this._plugin;
    var remoteDir = this._plugin.readConfig('remoteDir');
    var connectionOptions = this._getConnectionOptions.bind(this)();

    return new Promise(function(resolve, reject) {
      this.fetchRevisions()
      .then(function(revisions) {
        var revisionKeys = revisions.map(function(element) {
          return element.revision;
        });
        if (revisionKeys.indexOf(revisionKey) < 0) {
          plugin.log('Preparing to upload to `' + connectionOptions.host + '`',
            { verbose: true });
          conn.on('ready', function () {
            conn.sftp(function(err, sftp) {
              if (err) {
                throw err;
              }
              var targetFile = key + '.html';
              plugin.log('Uploading `' + targetFile + '`', { verbose: true });
              var writeStream = sftp.createWriteStream(remoteDir + targetFile);
              writeStream.on('error', function(err) {
                reject(err);
              });
              writeStream.on('finish', function() {
                plugin.log('Uploaded ok', { verbose: true });
                resolve(key);
              });
              writeStream.write(value);
              writeStream.end();
            });
          }).on('error', function (error) {
            reject(error);
          }).connect(connectionOptions);
        } else {
          reject('Revision already uploaded.');
        }
      }.bind(this))
      .catch(function (error) {
        reject(error);
      });
    }.bind(this));
  },

  _printErrorMessage: function (message) {
    return Promise.reject(message);
  },

  _getConnectionOptions: function() {
    var options = {
      host: this._plugin.readConfig('host'),
      username: this._plugin.readConfig('username'),
      port: this._plugin.readConfig('port'),
      agent: this._plugin.readConfig('agent'),
    };

    var privateKeyFile = this._plugin.readConfig('privateKeyFile');
    if (!!privateKeyFile) {
      options.privateKey = require('fs').readFileSync(privateKeyFile);
    } else {
      var password = this._plugin.readConfig('password');

      options.password = password;
    }

    return options;
  }

});
