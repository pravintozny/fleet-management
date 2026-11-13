# fleet-management

Reusable **Vehicle Management** and **Driver Management** components (TypeScript, zero dependencies).

```bash
npm test          # Node >= 22.6 (uses --experimental-strip-types)
```

```ts
import { createFleetServices, mockVehicles, mockDrivers } from './src/index.ts';
const { vehicles, drivers } = createFleetServices();
const v = vehicles.create(mockVehicles[0]);
const d = drivers.create(mockDrivers[0]);
vehicles.assignDriver(v.id, d.id);
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Out of scope: trips, fuel, maintenance, expenses, tracking, analytics.
