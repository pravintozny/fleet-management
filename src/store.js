// Minimal in-memory store shared by Trip and Fuel modules.
export function createStore() {
  return { trips: new Map(), fuelLogs: new Map(), seq: 0 };
}
export const nextId = (store, prefix) => `${prefix}_${++store.seq}`;
