import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function safeJoin(base, requestPath) {
  const file = path.normalize(path.join(base, requestPath));
  return file.startsWith(base) ? file : null;
}

function candidates(urlPath) {
  const clean = urlPath === '/' ? '/index.html' : urlPath;
  const list = [safeJoin(root, clean)];
  if (clean === '/globals.css') list.unshift(path.join(root, 'app', 'globals.css'));
  if (clean.startsWith('/images/') || clean.startsWith('/brand/') || clean === '/favicon.svg') list.unshift(path.join(root, 'public', clean));
  if (!path.extname(clean)) list.push(safeJoin(root, `${clean}.html`));
  return list.filter(Boolean);
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  for (const filePath of candidates(urlPath)) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`Not found: ${urlPath}`);
}).listen(port, () => console.log(`ALTIORA ESTATES dev server http://localhost:${port}`));
