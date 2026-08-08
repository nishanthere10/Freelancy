import type { ZodIssue } from "zod";

export type ClientErrorKind =
  | "not_found"
  | "conflict"
  | "permission_denied"
  | "validation"
  | "internal";

export abstract class ClientDomainError extends Error {
  abstract readonly code: string;
  abstract readonly errorKind: ClientErrorKind;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ClientNotFoundError extends ClientDomainError {
  readonly code = "CLIENT_NOT_FOUND";
  readonly errorKind = "not_found" as const;

  constructor(public readonly clientId: string) {
    super(`Client with id '${clientId}' was not found`);
  }
}

export class ClientEmailAlreadyExistsError extends ClientDomainError {
  readonly code = "CLIENT_EMAIL_ALREADY_EXISTS";
  readonly errorKind = "conflict" as const;

  constructor(public readonly email: string, public readonly workspaceId: string) {
    super(`Client with email '${email}' already exists in workspace '${workspaceId}'`);
  }
}

export class ClientDeletedError extends ClientDomainError {
  readonly code = "CLIENT_DELETED";
  readonly errorKind = "conflict" as const;

  constructor(public readonly clientId: string, public readonly operation: string) {
    super(`Cannot ${operation} client '${clientId}' because it is deleted`);
  }
}

export class ClientNotDeletedError extends ClientDomainError {
  readonly code = "CLIENT_NOT_DELETED";
  readonly errorKind = "conflict" as const;

  constructor(public readonly clientId: string) {
    super(`Client '${clientId}' is not deleted`);
  }
}

export class ClientPermissionDeniedError extends ClientDomainError {
  readonly code = "CLIENT_PERMISSION_DENIED";
  readonly errorKind = "permission_denied" as const;

  constructor(
    public readonly operation: string,
    public readonly actorId: string,
    public readonly workspaceId: string,
    public readonly reason: string,
  ) {
    super(`Permission denied: cannot ${operation} client in workspace '${workspaceId}': ${reason}`);
  }
}

export interface ClientValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class ClientValidationError extends ClientDomainError {
  readonly code = "CLIENT_VALIDATION_FAILED";
  readonly errorKind = "validation" as const;

  constructor(
    message: string,
    public readonly issues: readonly ClientValidationIssue[] = [],
  ) {
    super(message);
  }

  static fromZodIssues(issues: readonly ZodIssue[]): ClientValidationError {
    const mapped: ClientValidationIssue[] = issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const summary = mapped.length > 0 ? mapped[0].message : "Client input validation failed";
    return new ClientValidationError(summary, mapped);
  }
}

export class ClientInternalError extends ClientDomainError {
  readonly code = "CLIENT_INTERNAL_ERROR";
  readonly errorKind = "internal" as const;

  constructor(public readonly operation: string, public readonly cause?: unknown) {
    super(`Client operation '${operation}' failed unexpectedly`);
  }
}

export function isClientDomainError(error: unknown): error is ClientDomainError {
  return error instanceof ClientDomainError;
}
