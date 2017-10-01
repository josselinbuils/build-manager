const githubhook = require('githubhook');
const SSH = require('simple-ssh');

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

function getArg(name) {
  return (process.argv.slice(2).find(val => val.indexOf(name + '=') === 0) || '').slice(name.length + 1);
}

function buildService(name) {
  const ssh = new SSH({
    host: 'josselinbuils.me',
    user: 'root',
    pass: getArg('password')
  });

  ssh.on('error', (error) => {
    console.error(error);
    ssh.end();
  });

  ssh.exec(`cd /home/ubuntu/docker && docker-compose build --no-cache portfolio && docker-compose up -d`, {
    out: console.info
  }).start();
}