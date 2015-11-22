/* jshint node: true */
'use strict';
var DeployPluginBase = require('ember-cli-deploy-plugin');
var path       = require('path');

module.exports = {
  name: 'ember-cli-deploy-ssh-index',

  createDeployPlugin: function(options) {
    var SSHAdapter = require('./lib/ssh-adapter');

    var DeployPlugin = DeployPluginBase.extend({
      name: options.name,

      defaultConfig: {
        revisionKey: function(context) {
          return context.commandOptions.revision ||
            (context.revisionData && context.revisionData.revisionKey);
        },
        keyPrefix: function(context) {
          return context.project.name();
        },
        filePattern: 'index.html',
        distDir: function(context) {
          return context.distDir;
        },
        didDeployMessage: function(context) {
          var revisionKey, activatedRevisionKey;
          if (context.revisionData) {
            revisionKey = context.revisionData.revisionKey;
            activatedRevisionKey = context.revisionData.activatedRevisionKey;
          }
          if (revisionKey && !activatedRevisionKey) {
            return 'Deployed but did not activate revision ' + revisionKey +
                   '. To activate, run: ember deploy:activate ' +
                   context.deployTarget + ' --revision=' + revisionKey + '\n';
          }
        },
      },

      requiredConfig: ['host', 'username', 'remoteDir'],

      upload: function(/* context */) {
        var sshAdapter  = new SSHAdapter({ plugin: this });
        var distDir     = this.readConfig('distDir');
        var filePattern = this.readConfig('filePattern');
        var filePath    = path.join(distDir, filePattern);
        var buffer = require('fs').readFileSync(filePath);
        return sshAdapter.upload(buffer);
      },

      didDeploy: function(/* context */){
        var didDeployMessage = this.readConfig('didDeployMessage');
        if (didDeployMessage) {
          this.log(didDeployMessage);
        }
      },

      activate: function(/* context */) {
        var sshAdapter = new SSHAdapter({ plugin: this });
        var revisionKey = this.readConfig('revisionKey');
        return sshAdapter.activate(revisionKey);
      },

      fetchRevisions: function(context) {
        var sshAdapter = new SSHAdapter({ plugin: this });
        return sshAdapter.fetchRevisions()
          .then(function(revisions) {
            context.revisions = revisions;
          });
      }
    });

    return new DeployPlugin();
  }
};
