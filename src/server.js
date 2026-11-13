import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildAnalytics } from './analytics/analyticsService.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

export function createServer() {
  return http.createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    try {
      if (pathname === '/api/analytics') {
        if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
        return send(res, 200, buildAnalytics());
      }
      if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(await readFile(path.join(publicDir, 'index.html')));
      }
      return send(res, 404, { error: 'Not found' });
    } catch (err) {
      console.error(err);
      return send(res, 500, { error: 'Internal server error' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => console.log(`Fleet Management on http://localhost:${port}`));
}
