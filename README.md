# fleet-management

Dependency-free Node.js (>=18) app. Run `npm start` (port 3000, or `PORT`) and `npm test`.

## Modules
- **Trip Management** (`src/trips.js`): create trips (vehicle, driver, origin, destination), lifecycle `planned → in_progress → completed` (or `cancelled`) with odometer capture and distance calculation.
- **Fuel Management** (`src/fuel.js`): record fill-ups (optionally linked to a trip), cost totals, per-vehicle km/L summary.

## API
- `GET/POST /api/trips`, `GET /api/trips/:id`, `POST /api/trips/:id/status` `{status, odometer}`
- `GET/POST /api/fuel`, `DELETE /api/fuel/:id`, `GET /api/fuel/summary?vehicleId=`

Data is held in memory (resets on restart).
