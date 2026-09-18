const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  if (pathname === '/' || pathname === '') {
    pathname = '/studio.html';
  }

  if (req.method === 'POST' && pathname === '/api/save-deal') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const deal = JSON.parse(body);
        const slug = (deal.slug || deal.name || 'deal').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
        const dealsDir = path.join(PUBLIC_DIR, 'deals');
        if (!fs.existsSync(dealsDir)) fs.mkdirSync(dealsDir, { recursive: true });
        const filePath = path.join(dealsDir, `${slug}.json`);
        fs.writeFileSync(filePath, JSON.stringify(deal, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, slug, file: `deals/${slug}.json` }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`
============================================================
  KING INDUSTRIAL // DEAL STUDIO & PRESENTATION SUITE
============================================================
  Local Server Active: http://localhost:${PORT}/

  > Broker Deal Studio:
    http://localhost:${PORT}/studio.html

  > Client Presentation (Pearl Industrial):
    http://localhost:${PORT}/index.html?deal=pearl-industrial

  > Client Presentation (Live App):
    http://localhost:${PORT}/index.html
============================================================
  `);
});
