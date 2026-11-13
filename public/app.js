const $ = (id) => document.getElementById(id);
const api = async (path, opts = {}) => {
  const r = await fetch('/api/maintenance' + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (r.status === 204) return null;
  const body = await r.json();
  if (!r.ok) throw new Error([body.error, ...(body.details || [])].join(': '));
  return body;
};
const text = (tag, s, cls) => { const e = document.createElement(tag); e.textContent = s ?? ''; if (cls) e.className = cls; return e; };

async function load() {
  const [list, sum] = await Promise.all([api('?status=' + encodeURIComponent($('filter').value)), api('/summary')]);
  $('summary').replaceChildren(
    text('span', `Total: ${sum.total}`), text('span', `Overdue: ${sum.overdue}`), text('span', `Completed cost: ${sum.totalCost.toFixed(2)}`));
  $('rows').replaceChildren(...list.map((r) => {
    const tr = document.createElement('tr');
    if (r.overdue) tr.className = 'overdue';
    for (const v of [r.id, r.vehicleId, r.type, r.description, r.scheduledDate, r.status + (r.overdue ? ' (overdue)' : ''), r.cost ?? '']) tr.append(text('td', v));
    const td = document.createElement('td');
    const act = (label, fn) => { const b = text('button', label); b.onclick = () => fn().then(load, show); td.append(b, ' '); };
    if (r.status === 'scheduled') act('Start', () => api('/' + r.id, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) }));
    if (r.status === 'scheduled' || r.status === 'in_progress') {
      act('Complete', () => {
        const cost = prompt('Final cost (optional)');
        const body = { status: 'completed', completedDate: new Date().toISOString().slice(0, 10) };
        if (cost) body.cost = Number(cost);
        return api('/' + r.id, { method: 'PUT', body: JSON.stringify(body) });
      });
      act('Cancel', () => api('/' + r.id, { method: 'PUT', body: JSON.stringify({ status: 'cancelled' }) }));
    }
    if (r.status !== 'in_progress') act('Delete', () => api('/' + r.id, { method: 'DELETE' }));
    tr.append(td);
    return tr;
  }));
}
const show = (e) => { $('error').textContent = e.message; };

$('form').onsubmit = async (e) => {
  e.preventDefault();
  const body = {};
  for (const [k, v] of new FormData(e.target)) {
    if (v === '') continue;
    body[k] = ['cost', 'odometer', 'nextServiceOdometer'].includes(k) ? Number(v) : v;
  }
  try { await api('', { method: 'POST', body: JSON.stringify(body) }); $('error').textContent = ''; e.target.reset(); await load(); }
  catch (err) { show(err); }
};
$('filter').onchange = () => load().catch(show);
api('/meta').then((m) => {
  for (const t of m.types) $('type').append(new Option(t, t));
  for (const s of m.statuses) $('filter').append(new Option(s, s));
  return load();
}).catch(show);
