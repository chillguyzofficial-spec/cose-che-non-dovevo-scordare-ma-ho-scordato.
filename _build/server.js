// Server locale per provare l'agenda: node _build/server.js  ->  http://localhost:8996
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), PORTA = +process.env.PORTA || 8996;
const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2' };
http.createServer((q, r) => {
  let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
  fs.readFile(f, (e, b) => {
    if (e) { r.writeHead(404); return r.end('404'); }
    r.writeHead(200, { 'Content-Type': TIPI[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(b);
  });
}).listen(PORTA, () => console.log('Agenda su http://localhost:' + PORTA));
