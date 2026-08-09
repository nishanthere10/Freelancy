import type { ZodIssue } from "zod";

export type ProjectErrorKind =
  | "not_found"
  | "conflict"
  | "permission_denied"
  | "validation"
  | "internal"
  | "client_mismatch"
  | "invalid_transition";

export abstract class ProjectDomainError extends Error {
  abstract readonly code: string;
  abstract readonly errorKind: ProjectErrorKind;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ProjectNotFoundError extends ProjectDomainError {
  readonly code = "PROJECT_NOT_FOUND";
  readonly errorKind = "not_found" as const;

  constructor(public readonly projectId: string) {
    super(`Project with ID '${projectId}' was not found in this workspace`);
  }
}

export class ProjectSlugAlreadyExistsError extends ProjectDomainError {
  readonly code = "PROJECT_SLUG_ALREADY_EXISTS";
  readonly errorKind = "conflict" as const;

  constructor(public readonly slug: string, public readonly workspaceId: string) {
    super(`Project with slug '${slug}' already exists in workspace '${workspaceId}'`);
  }
}

export class ProjectDeletedError extends ProjectDomainError {
  readonly code = "PROJECT_DELETED";
  readonly errorKind = "conflict" as const;

  constructor(public readonly projectId: string, public readonly operation: string) {
    super(`Cannot ${operation} project '${projectId}' because it is archived/deleted`);
  }
}

export class ProjectNotDeletedError extends ProjectDomainError {
  readonly code = "PROJECT_NOT_DELETED";
  readonly errorKind = "conflict" as const;

  constructor(public readonly projectId: string) {
    super(`Project '${projectId}' is not archived/deleted`);
  }
}

export class ProjectClientWorkspaceMismatchError extends ProjectDomainError {
  readonly code = "CLIENT_WORKSPACE_MISMATCH";
  readonly errorKind = "client_mismatch" as const;

  constructor(public readonly clientId: string, public readonly workspaceId: string) {
    super(`Client '${clientId}' does not exist or does not belong to workspace '${workspaceId}'`);
  }
}

export class ProjectInvalidStatusTransitionError extends ProjectDomainError {
  readonly code = "PROJECT_INVALID_STATUS_TRANSITION";
  readonly errorKind = "invalid_transition" as const;

  constructor(public readonly fromStatus: string, public readonly toStatus: string) {
    super(`Invalid status transition from '${fromStatus}' to '${toStatus}'`);
  }
}

export class ProjectPermissionDeniedError extends ProjectDomainError {
  readonly code = "PROJECT_PERMISSION_DENIED";
  readonly errorKind = "permission_denied" as const;

  constructor(
    public readonly operation: string,
    public readonly actorId: string,
    public readonly workspaceId: string,
    public readonly reason: string,
  ) {
    super(`Permission denied: cannot ${operation} project in workspace '${workspaceId}': ${reason}`);
  }
}

export interface ProjectValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class ProjectValidationError extends ProjectDomainError {
  readonly code = "PROJECT_VALIDATION_FAILED";
  readonly errorKind = "validation" as const;

  constructor(
    message: string,
    public readonly issues: readonly ProjectValidationIssue[] = [],
  ) {
    super(message);
  }

  static fromZodIssues(issues: readonly ZodIssue[]): ProjectValidationError {
    const mapped: ProjectValidationIssue[] = issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const summary = mapped.length > 0 ? mapped[0].message : "Project input validation failed";
    return new ProjectValidationError(summary, mapped);
  }
}

export class ProjectInternalError extends ProjectDomainError {
  readonly code = "PROJECT_INTERNAL_ERROR";
  readonly errorKind = "internal" as const;

  constructor(public readonly operation: string, public readonly cause?: unknown) {
    super(`Project operation '${operation}' failed unexpectedly`);
  }
}

export function isProjectDomainError(error: unknown): error is ProjectDomainError {
  return error instanceof ProjectDomainError;
}
