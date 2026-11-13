import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.js';
import { createTrip, getTrip, listTrips, transitionTrip, ValidationError, NotFoundError } from './trips.js';
import { addFuelLog, listFuelLogs, deleteFuelLog, fuelSummary } from './fuel.js';

export function createApp(store = createStore()) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const send = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(body === undefined ? '' : JSON.stringify(body));
    };
    try {
      const q = Object.fromEntries(url.searchParams);
      const parts = url.pathname.split('/').filter(Boolean);
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        const html = await readFile(fileURLToPath(new URL('../public/index.html', import.meta.url)));
        res.writeHead(200, { 'content-type': 'text/html' });
        return res.end(html);
      }
      let body = {};
      if (req.method === 'POST') {
        let raw = '';
        for await (const c of req) raw += c;
        try { body = raw ? JSON.parse(raw) : {}; } catch { throw new ValidationError('invalid JSON'); }
      }
      if (parts[0] === 'api' && parts[1] === 'trips') {
        if (parts.length === 2 && req.method === 'GET') return send(200, listTrips(store, q));
        if (parts.length === 2 && req.method === 'POST') return send(201, createTrip(store, body));
        if (parts.length === 3 && req.method === 'GET') return send(200, getTrip(store, parts[2]));
        if (parts.length === 4 && parts[3] === 'status' && req.method === 'POST')
          return send(200, transitionTrip(store, parts[2], body.status, body));
      }
      if (parts[0] === 'api' && parts[1] === 'fuel') {
        if (parts.length === 2 && req.method === 'GET') return send(200, listFuelLogs(store, q));
        if (parts.length === 2 && req.method === 'POST') return send(201, addFuelLog(store, body));
        if (parts[2] === 'summary' && req.method === 'GET') return send(200, fuelSummary(store, q.vehicleId));
        if (parts.length === 3 && req.method === 'DELETE') { deleteFuelLog(store, parts[2]); return send(204); }
      }
      send(404, { error: 'not found' });
    } catch (e) {
      if (e instanceof ValidationError) return send(400, { error: e.message });
      if (e instanceof NotFoundError) return send(404, { error: e.message });
      send(500, { error: 'internal error' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`fleet-management on :${port}`));
}
