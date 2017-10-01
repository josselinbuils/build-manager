const {spawn} = require('child_process');
const githubhook = require('githubhook');

const repositories = ['pathFinding', 'portfolio', 'reverseProxy', 'teravia'];

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
  const child = spawn('docker-compose', ['build', '--no-cache', name]);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.on('close', code => console.info(`child process exited with code ${code}`));
}


