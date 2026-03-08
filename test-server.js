const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Enable CORS for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRFToken, X-Frame-Options, Accept, Accept-Encoding, DNT, Origin, User-Agent, X-API-Key, Cache-Control');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url === '/' || req.url === '/index.html') {
        fs.readFile(path.join(__dirname, 'test-login.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading test-login.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.url === '/simple') {
        fs.readFile(path.join(__dirname, 'simple-test.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading simple-test.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.url === '/debug') {
        fs.readFile(path.join(__dirname, 'login-debug.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading login-debug.html');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`Test server running at http://localhost:${PORT}/`);
    console.log('Open your browser and navigate to: http://localhost:8080/');
    console.log('CORS is enabled for all origins');
});
