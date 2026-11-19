# fleet-management

## Data share component

`src/dataShare` creates expiring, revocable share links for fleet datasets
(`vehicles`, `trips`, `reports`) restricted to listed recipients with `view` or
`download` permission and JSON/CSV export.

```js
import { createDataShareService } from './src/dataShare/index.js';
const svc = createDataShareService({ datasets: { vehicles } });
const share = svc.createShare({ dataset: 'vehicles', recipients: ['ops@example.com'], permission: 'download', format: 'csv' });
svc.accessShare(share.token, 'ops@example.com');
```

Run tests with `npm test`.
