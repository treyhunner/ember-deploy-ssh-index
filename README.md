# ember-cli-deploy-ssh-index

> An [ember-cli-deploy][] plugin for deploying your index page to a server via SSH.

<hr/>
**WARNING: This plugin is only compatible with ember-cli-deploy versions >= 0.5.0**
<hr/>

## Installation

* `ember install ember-cli-deploy-ssh-index`

## Configuration

To use this plugin, set `type` to `"ssh"` in your [ember-cli-deploy][] configuration.

The following configuration options are supported by this plugin:

- `host`: SSH host server
- `port`: SSH port
- `username`: SSH user
- `remoteDir`: Remote directory to upload index pages
- `privateKeyFile`: local private key file to use for SSH connection

To set configuration variables, follow the instructions in the [ember-cli-deploy][] documentation.

Example `config/deploy.js` file using ember-cli-deploy-ssh-index with [ember-cli-deploy-s3][] and environment variables to store the private key file and AWS information:

```javascript
/* jshint node: true */

module.exports = function(deployTarget) {
  var ENV = {
    build: {
      environment: deployTarget,
    },
    'revision-data': {
      type: 'git-commit',
    },
    'ssh-index': {
      remoteDir: "/var/www/",
      host: "example.com",
      username: "root",
      privateKeyFile: process.env.SSH_KEY_FILE,  # Example: /home/user/.ssh/id_rsa
    },
    s3: {
      accessKeyId: process.env.AWS_KEY,
      secretAccessKey: process.env.AWS_SECRET,
      bucket: "assets.example.com",
    }
  };
  return ENV;
};
```

You will probably need to prefix your static asset links with a URL based on your asset deploy plugin.  For example if you are using [ember-cli-deploy-s3][] with a bucket named `assets.example.com` you might fingerprint like this:

```javascript
var app = new EmberApp({
  fingerprint: {
    prepend: 'https://s3.amazonaws.com/assets.example.com/',
    enabled: true
  },
});
```


## Usage

* Deploy to production: `ember deploy production`
* List deployed revisions: `ember deploy:list production`
* Activate a revision: `ember deploy:activate production --revision=$TAG` (where `$TAG` is the tag name)


# License

This is released under an [MIT license][].


[ember-cli-deploy]: https://github.com/ember-cli/ember-cli-deploy
[ember-cli-deploy-s3]: https://github.com/ember-cli-deploy/ember-cli-deploy-s3
[mit license]: http://th.mit-license.org/
