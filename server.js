const http = require('http');
const createHandler = require('github-webhook-handler');
const handler = createHandler({path: '/webhook'});

http.createServer((req, res) => {
    handler(req, res, () => {
        res.statusCode = 404;
        res.end('Not Found')
    });
}).listen(8090);

handler.on('error', err => {
    console.error('Error:', err.message);
});

handler.on('push', event => {
    console.log('Received a push event for %s to %s', event.payload.repository.name, event.payload.ref);
});