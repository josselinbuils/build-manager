const githubhook = require('githubhook');
const ssh = require('ssh-exec');

const repositories = ['pathFinding', 'portfolio', 'reverseProxy', 'teravia', 'test'];

const handler = githubhook({
  path: '/webhook',
  port: 8090,
  secret: getArg('secret')
});

handler.on('push', (repos, ref) => {
  if (repositories.indexOf(repos) !== -1 && ref === 'refs/heads/master') {
    buildService(repos.toLowerCase());
  }
});

handler.listen();

function buildService(name) {
  ssh('cd /home/ubuntu/docker && docker-compose build --no-cache reverseproxy && docker-compose up -d', {
    host: 'josselinbuils.me',
    user: 'root',
    password: getArg('password')
  }).pipe(process.stdout)
}

function getArg(name) {
  return (process.argv.slice(2).find(val => val.indexOf(name + '=') === 0) || '').slice(name.length + 1);
}