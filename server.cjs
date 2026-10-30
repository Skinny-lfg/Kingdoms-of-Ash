'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.env.PORT || 3000);
const assets = {
  '/': { filename: 'index.html', contentType: 'text/html; charset=utf-8' },
  '/index.html': { filename: 'index.html', contentType: 'text/html; charset=utf-8' },
  '/styles.css': { filename: 'styles.css', contentType: 'text/css; charset=utf-8' },
  '/game.js': { filename: 'game.js', contentType: 'text/javascript; charset=utf-8' }
};

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch (_) { res.writeHead(400); return res.end('Bad request'); }

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(req.method === 'HEAD' ? undefined : 'ok');
  }
  const asset = assets[url.pathname];
  if (!asset) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
  const filename = path.join(__dirname, asset.filename);
  fs.stat(filename, (statErr, stat) => {
    if (statErr || !stat.isFile()) { res.writeHead(500); return res.end('Asset unavailable'); }
    res.writeHead(200, {
      'Content-Type': asset.contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(filename);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log('Kingdoms of Ash listening on port ' + port);
});
