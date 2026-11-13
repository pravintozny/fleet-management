# fleet-management

Zero-dependency Node.js (>=20) app.

## Fuel Management

Track fill-ups per vehicle, with validation and efficiency reporting.

- `npm start` – serves UI at http://localhost:3000 (`PORT` to override)
- `npm test` – runs the test suite (`node --test`)

### API
| Method | Path | Description |
|---|---|---|
| GET | `/api/fuel?vehicleId=&from=&to=` | List entries |
| POST | `/api/fuel` | Create entry (`vehicleId, date, fuelType, quantity, unitPrice, odometer, fullTank?, station?`) |
| GET/PUT/DELETE | `/api/fuel/:id` | Read / update / delete |
| GET | `/api/fuel/summary` | Per-vehicle totals, L/100km, cost per km |

Validation: positive quantity and price, known fuel type, non-future date, and odometer must be consistent with other entries for the vehicle. Data is stored in memory.
