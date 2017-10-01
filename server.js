const githubhook = require('githubhook');
const {validate} = require('jsonschema');
const ssh = require('ssh-exec');

const config = validate(require('./config.json'), require('./config.schema.json'), {throwError: true}).instance;
const handler = githubhook(config.hook);

handler.on('push', (repos, ref) => {
  if (config.repositories.indexOf(repos) !== -1 && ref === 'refs/heads/master') {
    const command = `cd /home/ubuntu/docker && docker-compose build --no-cache ${repos.toLowerCase()} && docker-compose up -d`;
    ssh(command, config.ssh).pipe(process.stdout);
  }
});

handler.listen();