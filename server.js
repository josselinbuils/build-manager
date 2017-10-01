const githubhook = require('githubhook');
const handler = githubhook({port: 8090, secret: getArg('secret')});

handler.on('push', (ref, data) => {
    console.log('hello', ref, data);
});

handler.listen();

function getArg(name) {
    return (process.argv.slice(2).find(val => val.indexOf(name + '=') === 0) || '').slice(name.length + 1);
}