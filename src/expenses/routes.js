import { ConflictError, NotFoundError } from './service.js';
import { CATEGORIES, STATUSES, ValidationError } from './validation.js';

const ID = '([0-9a-f-]{36})';
const ACTIONS = { submit: 'submitted', approve: 'approved', reject: 'rejected', reimburse: 'reimbursed', reopen: 'draft' };

/** Returns async handler(req, res) -> true if handled. Mounted under /api/expenses. */
export function expenseRoutes(service) {
  return async (req, res, url) => {
    const p = url.pathname;
    if (!p.startsWith('/api/expenses') && p !== '/api/expense-meta') return false;
    try {
      const m = req.method;
      let r;
      if (p === '/api/expense-meta' && m === 'GET') r = [200, { categories: CATEGORIES, statuses: STATUSES }];
      else if (p === '/api/expenses/summary' && m === 'GET') r = [200, service.summary(Object.fromEntries(url.searchParams))];
      else if (p === '/api/expenses' && m === 'GET') r = [200, service.list(Object.fromEntries(url.searchParams))];
      else if (p === '/api/expenses' && m === 'POST') r = [201, service.create(await readJson(req))];
      else {
        let g;
        if ((g = p.match(new RegExp(`^/api/expenses/${ID}$`)))) {
          if (m === 'GET') r = [200, service.get(g[1])];
          else if (m === 'PATCH' || m === 'PUT') r = [200, service.update(g[1], await readJson(req))];
          else if (m === 'DELETE') { service.delete(g[1]); r = [204, null]; }
        } else if ((g = p.match(new RegExp(`^/api/expenses/${ID}/(\\w+)$`))) && m === 'POST' && ACTIONS[g[2]]) {
          const body = await readJson(req, true);
          r = [200, service.transition(g[1], ACTIONS[g[2]], body)];
        }
      }
      if (!r) return send(res, 404, { error: 'Not found' });
      return send(res, ...r);
    } catch (err) {
      if (err instanceof ValidationError) return send(res, 400, { error: err.message, details: err.errors });
      if (err instanceof NotFoundError) return send(res, 404, { error: err.message });
      if (err instanceof ConflictError) return send(res, 409, { error: err.message });
      return send(res, 500, { error: 'Internal server error' });
    }
  };
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body === null ? undefined : JSON.stringify(body));
  return true;
}

async function readJson(req, optional = false) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 100_000) throw new ValidationError({ body: 'too large' });
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString();
  if (!raw.trim()) {
    if (optional) return {};
    throw new ValidationError({ body: 'JSON body required' });
  }
  try { return JSON.parse(raw); } catch { throw new ValidationError({ body: 'invalid JSON' }); }
}
