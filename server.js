const githubhook = require('githubhook');
const { validate } = require('jsonschema');
const ssh = require('ssh-exec');

const configSchema = require('./config.schema.json');
const rawConfig = require('./config.json');

const Mode = {
  Clean: 'clean',
  Update: 'update',
};
const DEFAULT_BUILD_MODE = Mode.Update;

const config = validate(rawConfig, configSchema, { throwError: true }).instance;
const handler = githubhook(config.hook);

function build(repos, mode) {
  console.log(`Builds ${repos} using ${mode} mode...`);

  const service = repos.replace(/-/g, '').toLowerCase();
  const container = `docker_${service}_1`;
  let commands;

  switch (mode) {
    case Mode.Clean:
      commands = [
        'cd /home/ubuntu/docker',
        `docker-compose build --no-cache ${service}`,
        'docker-compose up -d',
        'docker system prune -f',
      ];
      break;

    case Mode.Update:
      const dockerCommands = [
        'git checkout .',
        'git pull',
        'yarn install --production --frozen-lockfile',
        '([[ $(npm run | grep "^ *build *$") ]] && yarn build)',
        'exit',
      ];
      commands = [
        `docker exec ${container} bash -c '${dockerCommands.join(' && ')}'`,
        `docker restart ${container}`,
      ];
      break;

    default:
      console.error(`Unknown mode: ${mode}`);
  }

  const command = commands.join(' && ');

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
    build(repos, DEFAULT_BUILD_MODE);
  }
});

handler.listen();
