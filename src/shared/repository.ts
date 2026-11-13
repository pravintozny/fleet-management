export interface Repository<T extends { id: string }> {
  get(id: string): T | undefined;
  list(): T[];
  save(entity: T): T;
  delete(id: string): boolean;
}

/** In-memory repository; stores clones so callers cannot mutate state. */
export class InMemoryRepository<T extends { id: string }> implements Repository<T> {
  private readonly items = new Map<string, T>();
  get(id: string): T | undefined {
    const v = this.items.get(id);
    return v ? structuredClone(v) : undefined;
  }
  list(): T[] {
    return [...this.items.values()].map((v) => structuredClone(v));
  }
  save(entity: T): T {
    this.items.set(entity.id, structuredClone(entity));
    return structuredClone(entity);
  }
  delete(id: string): boolean {
    return this.items.delete(id);
  }
}

let counter = 0;
export type IdGenerator = (prefix: string) => string;
export const defaultIdGenerator: IdGenerator = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;
export type Clock = () => Date;
