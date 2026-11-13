# fleet-management

## Expense Management component

Dependency-free Node.js (>=18) implementation: REST API, simple web UI, in-memory storage.

```
npm start      # http://localhost:3000/expenses  (PORT env to override)
npm test
```

### API
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/expenses` | list (filters: `vehicleId,category,status,from,to`) / create |
| GET/PATCH/DELETE | `/api/expenses/:id` | edit/delete only while `draft` |
| POST | `/api/expenses/:id/{submit,approve,reject,reimburse,reopen}` | body `{actor?, note?}`; `note` required for reject |
| GET | `/api/expenses/summary` | totals by category/vehicle/status/currency (same filters) |
| GET | `/api/expense-meta` | categories and statuses |

Workflow: `draft → submitted → approved → reimbursed`; `submitted → rejected → draft`.

### Limits
`vehicleId` is a free-form string (no vehicle module exists on `main`); no auth/roles; storage is in-memory (lost on restart).
