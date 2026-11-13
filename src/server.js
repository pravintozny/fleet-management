import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ExpenseService } from './expenses/service.js';
import { expenseRoutes } from './expenses/routes.js';

export function createApp(service = new ExpenseService()) {
  const handle = expenseRoutes(service);
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (await handle(req, res, url)) return;
    if (url.pathname === '/' || url.pathname === '/expenses') {
      const html = await readFile(fileURLToPath(new URL('../public/expenses.html', import.meta.url)));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`Fleet management listening on http://localhost:${port}`));
}
