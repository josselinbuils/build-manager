const githubhook = require('githubhook');
const { validate } = require('jsonschema');
const ssh = require('ssh-exec');

// noinspection JSFileReferences
const config = validate(require('./config.json'), require('./config.schema.json'), { throwError: true }).instance;

process.on('uncaughtException', error => console.error(error));

const handler = githubhook(config.hook);

handler.on('push', (repos, ref) => {
  if (config.repositories.indexOf(repos) !== -1 && ref === 'refs/heads/master') {
    console.log(`Build ${repos}...`);
    const service = `docker_${repos.replace(/-/g, '').toLowerCase()}_1`;
    // const command = `cd /home/ubuntu/docker && docker-compose build --no-cache ${service} && docker-compose up -d && docker system prune -f`;
    const command = `docker exec -it docker_${service}_1 bash -c "git checkout . && git pull && npm i && exit" && docker restart ${service}`;
    ssh(command, config.ssh).pipe(process.stdout);
  }
});

handler.listen();
