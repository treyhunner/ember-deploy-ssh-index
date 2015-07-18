# ember-deploy-ssh-index

[![NPM Version](https://img.shields.io/npm/v/ember-deploy-ssh-index.svg)](https://www.npmjs.com/package/ember-deploy-ssh-index) [![Build Status](https://img.shields.io/travis/treyhunner/ember-deploy-ssh-index/master.svg)](http://travis-ci.org/treyhunner/ember-deploy-ssh-index) [![Code Climate](https://img.shields.io/codeclimate/github/treyhunner/ember-deploy-ssh-index.svg)](https://codeclimate.com/github/treyhunner/ember-deploy-ssh-index) [![codecov.io](https://img.shields.io/codecov/c/github/treyhunner/ember-deploy-ssh-index/master.svg)](http://codecov.io/github/treyhunner/ember-deploy-ssh-index?branch=master)


This is an [ember-cli-deploy][] adapter for deploying your index page to a server via SSH.

## Installation

* `npm install --save-dev ember-deploy-ssh-index`

## Configuration

To use this plugin, set `type` to `"ssh"` in your [ember-cli-deploy][] configuration.

The following configuration options are supported by this plugin:

- `host`: SSH host server
- `username`: SSH user
- `remoteDir`: Remote directory to upload index pages
- `privateKeyFile`: local private key file to use for SSH connection

To set configuration variables, follow the instructions in the [ember-cli-deploy][] documentation.

Example `config/deploy.js` file using ember-deploy-ssh-index with [ember-deploy-s3][] and environment variables to store the private key file and AWS information:

```javascript
/* jshint node: true */

module.exports = {
  production: {
    store: {
      type: "ssh",
      remoteDir: "/var/www/",
      host: "example.com",
      username: "root",
      privateKeyFile: process.env.SSH_KEY_FILE,  # Example: /home/user/.ssh/id_rsa
    },
    assets: {
      type: "s3",
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      bucket: "assets.example.com",
    }
  }
};
```

You will probably need to prefix your static asset links with a URL based on your asset deploy plugin.  For example if you are using [ember-deploy-s3][] with a bucket named `assets.example.com` you might fingerprint like this:

```javascript
var app = new EmberApp({
  fingerprint: {
    prepend: 'https://s3.amazonaws.com/assets.example.com/',
    enabled: true
  },
});
```


## Usage

* Deploy to production: `ember deploy -e production`
* List deployed revisions: `ember deploy:list -e production`
* Activate a revision: `ember deploy:activate --revision $TAG -e production` (where `$TAG` is the tag name)


# License

This is released under an [MIT license][].


[ember-cli-deploy]: https://github.com/ember-cli/ember-cli-deploy
[ember-deploy-s3]: https://github.com/LevelbossMike/ember-deploy-s3
[mit license]: http://th.mit-license.org/
