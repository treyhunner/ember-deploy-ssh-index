/* jshint node: true */
'use strict';
var CoreObject = require('core-object');
var Promise = require('ember-cli/lib/ext/promise');
var SilentError = require('ember-cli/lib/errors/silent');
var ssh2 = require('ssh2');

module.exports = CoreObject.extend({
  init: function() {
    CoreObject.prototype.init.apply(this, arguments);
    if (!this.config) {
      return Promise.reject(new SilentError('You must supply a config'));
    }

    this.client = new ssh2.Client();
  },

  activate: function(revision) {
    return this._getFileList()
    .then(this._excludeCurrentRevisionFile.bind(this))
    .then(this._getRevisions.bind(this))
    .then(this._activateRevision.bind(this, revision))
    .then(this._printSuccessMessage.bind(this, 'Revision activated: ' + revision));
  },

  list: function() {
    return this._list()
    .then(this._printRevisions.bind(this));
  },

  upload: function(buffer) {
    var key = this.taggingAdapter.createTag();
    return this._uploadIfMissing(buffer, key);
  },

  _list: function() {
    return this._getFileList()
    .then(this._sortFileList.bind(this))
    .then(this._excludeCurrentRevisionFile.bind(this))
    .then(this._getRevisions.bind(this));
  },

  _getFileList: function() {
    var conn = this.client;
    var config = this.config;
    return new Promise(function (resolve, reject) {
      conn.on('ready', function () {
        conn.sftp(function(err, sftp) {
          if (err) {
            throw err;
          }
          sftp.readdir(config.remoteDir, function(err, list) {
            if (err) {
              reject(err);
            } else {
              conn.end();
              resolve(list);
            }
          });
        });
      }).on('error', function (error) {
        reject(error);
      }).connect({
        host: config.host,
        username: config.username,
        privateKey: require('fs').readFileSync(config.privateKeyFile),
      });
    });
  },

  _sortFileList: function(fileList) {
    return fileList.sort(function(a, b) {
      return b.attrs.mtime - a.attrs.mtime;
    });
  },

  _getRevisions: function(files) {
    return files.map(function(file) {
      return file.filename.substring(0, (file.filename.length - 5));
    });
  },

  _excludeCurrentRevisionFile: function(data) {
    return data.filter(function (file) {
      return file.filename !== 'index.html';
    });
  },

  _activateRevision: function (targetRevision, revisions) {
    if (revisions.indexOf(targetRevision) > -1) {
      var conn = this.client;
      var config = this.config;
      var revisionFile = config.remoteDir + targetRevision + '.html';
      var indexFile = config.remoteDir + 'index.html';
      return new Promise(function (resolve, reject) {
        conn.on('ready', function () {
          conn.sftp(function(err, sftp) {
            if (err) {
              throw err;
            }
            sftp.unlink(indexFile, function (err) {
              if (err) {
                throw err;
              }
              sftp.symlink(revisionFile, indexFile, function(err) {
                if (err) {
                  reject(err);
                } else {
                  conn.end();
                  resolve();
                }
              });
            });
          });
        }).on('error', function (error) {
          reject(error);
        }).connect({
          host: config.host,
          username: config.username,
          privateKey: require('fs').readFileSync(config.privateKeyFile),
        });
      });
    } else {
      return this._printErrorMessage("Revision doesn't exist");
    }
  },

  _uploadIfMissing: function(value, key) {
    var conn = this.client;
    var config = this.config;
    return new Promise(function(resolve, reject) {
      this._list()
      .then(function(revisions) {
        if (revisions.indexOf(key) < 0) {
          conn.on('ready', function () {
            conn.sftp(function(err, sftp) {
              if (err) {
                throw err;
              }
              var writeStream = sftp.createWriteStream(config.remoteDir + key + '.html');
              writeStream.on('error', function(err) {
                reject(err);
              });
              writeStream.on('finish', function() {
                resolve();
              });
              writeStream.write(value);
            });
          }).on('error', function (error) {
            reject(error);
          }).connect({
            host: config.host,
            username: config.username,
            privateKey: require('fs').readFileSync(config.privateKeyFile),
          });
        } else {
          reject(new SilentError('Revision already uploaded.'));
        }
      }.bind(this))
      .catch(function (error) {
        reject(error);
      });
    }.bind(this));
  },

  _printRevisions: function(list) {
    var header = 'Found the following revisions:';
    var revisionsList = list.join('\n');
    return this._printSuccessMessage('\n' + header + '\n\n' + revisionsList + '\n');
  },

  _printSuccessMessage: function (message) {
    return this.ui.writeLine(message);
  },

  _printErrorMessage: function (message) {
    return Promise.reject(new SilentError(message));
  },

});
