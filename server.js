const githubhook = require('githubhook');
const hook = githubhook({port: 8090});

hook.on('push:test', (ref, data) => {
    console.log('hello', ref, data);
});

hook.listen();