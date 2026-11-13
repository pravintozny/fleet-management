# fleet-management

Zero-dependency Node.js (>=20) app.

## Maintenance Management

Schedule and track vehicle maintenance (preventive, corrective, inspection, recall).

- `npm start` – serves UI at http://localhost:3000 (`PORT` to override)
- `npm test` – runs the test suite (`node --test`)

### API
| Method | Path | Description |
|---|---|---|
| GET | `/api/maintenance?vehicleId=&status=&type=&from=&to=&overdue=true` | List records (each includes `overdue`) |
| POST | `/api/maintenance` | Create (`vehicleId, type, description, scheduledDate` required; `status, completedDate, cost, odometer, nextServiceOdometer, nextServiceDate, vendor, notes` optional) |
| GET/PUT/DELETE | `/api/maintenance/:id` | Read / update (partial) / delete |
| GET | `/api/maintenance/summary` | Totals, per-status counts, overdue count, cost per vehicle |
| GET | `/api/maintenance/meta` | Allowed types and statuses |

Rules: dates are `YYYY-MM-DD`; costs/odometers non-negative; `nextServiceOdometer > odometer`; `nextServiceDate > scheduledDate`; `completedDate` required (not future) iff status is `completed`. Status flow: `scheduled → in_progress → completed`, either open state → `cancelled`; completed/cancelled records are read-only; in-progress records cannot be deleted. Data is in memory.

### Integration note
`main` currently contains only LICENSE and README (the vehicle/driver, trip and fuel PRs are unmerged), so `vehicleId` is a free-form string and is not checked against a Vehicle module. Once vehicles are merged, validate it against the vehicle store. `package.json` and `src/server.js` here are minimal scaffolding and will conflict with the other PRs' equivalents.
