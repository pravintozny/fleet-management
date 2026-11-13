export class ValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(`Validation failed: ${issues.join('; ')}`);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}
export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
