import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { FuelService, ValidationError, NotFoundError } from './fuel/fuelService.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const MAX_BODY = 64 * 1024;

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > MAX_BODY) { reject(Object.assign(new Error('Body too large'), { status: 413 })); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

export function createServer(fuel = new FuelService()) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);
    try {
      if (parts[0] === 'api' && parts[1] === 'fuel') {
        const q = Object.fromEntries(url.searchParams);
        if (parts.length === 2 && req.method === 'GET') return send(res, 200, fuel.list(q));
        if (parts.length === 2 && req.method === 'POST') return send(res, 201, fuel.create(await readJson(req)));
        if (parts[2] === 'summary' && req.method === 'GET') return send(res, 200, fuel.summary(q));
        if (parts.length === 3 && req.method === 'GET') return send(res, 200, fuel.get(parts[2]));
        if (parts.length === 3 && req.method === 'PUT') return send(res, 200, fuel.update(parts[2], await readJson(req)));
        if (parts.length === 3 && req.method === 'DELETE') { fuel.remove(parts[2]); return send(res, 204); }
        return send(res, 405, { error: 'Method not allowed' });
      }
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(await readFile(path.join(publicDir, 'index.html')));
      }
      return send(res, 404, { error: 'Not found' });
    } catch (err) {
      if (err instanceof ValidationError) return send(res, 400, { error: err.message, details: err.errors });
      if (err instanceof NotFoundError) return send(res, 404, { error: err.message });
      if (err.status) return send(res, err.status, { error: err.message });
      console.error(err);
      return send(res, 500, { error: 'Internal server error' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => console.log(`Fleet Management on http://localhost:${port}`));
}
