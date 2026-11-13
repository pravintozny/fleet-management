'use strict';
const { HttpError } = require('./store');
const { TYPES, STATUSES } = require('./validation');

/** Handles /api/maintenance*. Returns true if handled. */
async function handle(store, req, res, url, readBody) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api','maintenance',...]
  if (parts[0] !== 'api' || parts[1] !== 'maintenance') return false;
  const send = (code, body) => {
    if (body === undefined) { res.writeHead(code); return res.end(); }
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  try {
    const id = parts[2];
    const m = req.method;
    if (parts.length === 2) {
      if (m === 'GET') return send(200, store.list(Object.fromEntries(url.searchParams))), true;
      if (m === 'POST') return send(201, store.create(await readBody(req))), true;
    } else if (parts.length === 3 && id === 'summary' && m === 'GET') {
      return send(200, store.summary()), true;
    } else if (parts.length === 3 && id === 'meta' && m === 'GET') {
      return send(200, { types: TYPES, statuses: STATUSES }), true;
    } else if (parts.length === 3) {
      if (m === 'GET') return send(200, store.get(id)), true;
      if (m === 'PUT' || m === 'PATCH') return send(200, store.update(id, await readBody(req))), true;
      if (m === 'DELETE') return store.delete(id), send(204), true;
    }
    throw new HttpError(405, 'method not allowed');
  } catch (e) {
    if (e instanceof HttpError) send(e.status, { error: e.message, details: e.details });
    else send(500, { error: 'internal error' });
    return true;
  }
}

module.exports = { handle };
