# fleet-management

## Fleet analytics

Zero-dependency Node (>=20) app. `npm start` serves the dashboard at http://localhost:3000 and `GET /api/analytics`
returns KPIs, status distribution, utilization by type, top vehicles and monthly trends.
Data currently comes from isolated sample data in `src/analytics/sampleData.js`; pass real data into `buildAnalytics()` when sources exist.

`npm test` runs the test suite (`node --test`).
