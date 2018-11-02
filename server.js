const githubhook = require('githubhook');
const { validate } = require('jsonschema');
const ssh = require('ssh-exec');

// noinspection JSFileReferences
const config = validate(require('./config.json'), require('./config.schema.json'), { throwError: true }).instance;
const handler = githubhook(config.hook);

const Mode = {
  Clean: 'clean',
  Update: 'update',
};
const buildMode = Mode.Clean;

function build(repos, mode) {
  console.log(`Builds ${repos} using ${mode} mode...`);

  const service = repos.replace(/-/g, '').toLowerCase();
  const container = `docker_${service}_1`;
  const command = mode === Mode.Update
    ? `docker exec ${container} bash -c "git checkout . && git pull && npm i && exit" && docker restart ${container}`
    : `cd /home/ubuntu/docker && docker-compose build --no-cache ${service} && docker-compose up -d && docker system prune -f`;

  console.log(`-> ${command}`);

  ssh(command, config.ssh, (error, stdout, stderr) => {
    if (error) {
      console.error(stderr);

      if (stderr.includes('not running')) {
        console.log('Docker container seems to be stopped, retry in clean mode');
        build(repos, Mode.Clean);
      }
    } else {
      console.log('Success');
    }
  }).pipe(process.stdout);
}

handler.on('push', (repos, ref) => {
  if (config.repositories.indexOf(repos) !== -1 && ref === 'refs/heads/master') {
    build(repos, buildMode);
  }
});

handler.listen();
