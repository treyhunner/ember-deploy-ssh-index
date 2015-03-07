/* jshint node: true */
'use strict';
var SSHAdapter = require('./lib/ssh-adapter');

module.exports = {
  name: 'ember-deploy-ssh-index',
  type: 'ember-deploy-addon',
  adapters: {
    index: {
      'ssh': SSHAdapter
    }
  }
};
