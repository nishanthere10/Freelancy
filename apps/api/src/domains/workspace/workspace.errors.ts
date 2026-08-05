/**
 * Workspace domain errors
 *
 * Typed errors representing business-level failure conditions.
 * These errors are transport-agnostic: they carry no HTTP status codes,
 * headers, or framework concerns. The controller layer (future) maps
 * `code` / `errorKind` to HTTP responses in exactly one place.
 */

import type { ZodIssue } from "zod";

/**
 * Broad failure categories. Controllers translate these into transport
 * semantics; the domain layer only states what kind of failure occurred.
 */
export type WorkspaceErrorKind =
  | "not_found"
  | "conflict"
  | "permission_denied"
  | "validation"
  | "internal";

/**
 * Base class for all workspace domain errors.
 */
export abstract class WorkspaceDomainError extends Error {
  abstract readonly code: string;
  abstract readonly errorKind: WorkspaceErrorKind;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
    // Maintain prototype chain under transpiled ES targets
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * The referenced workspace does not exist.
 */
export class WorkspaceNotFoundError extends WorkspaceDomainError {
  readonly code = "WORKSPACE_NOT_FOUND";
  readonly errorKind = "not_found" as const;

  constructor(public readonly workspaceId: string) {
    super(`Workspace with id '${workspaceId}' was not found`);
  }
}

/**
 * A workspace with the same slug already exists.
 */
export class WorkspaceAlreadyExistsError extends WorkspaceDomainError {
  readonly code = "WORKSPACE_ALREADY_EXISTS";
  readonly errorKind = "conflict" as const;

  constructor(public readonly slug: string) {
    super(`A workspace with slug '${slug}' already exists`);
  }
}

/**
 * An operation was attempted on a soft-deleted workspace.
 */
export class WorkspaceDeletedError extends WorkspaceDomainError {
  readonly code = "WORKSPACE_DELETED";
  readonly errorKind = "conflict" as const;

  constructor(
    public readonly workspaceId: string,
    public readonly operation: string,
  ) {
    super(
      `Cannot ${operation} workspace '${workspaceId}' because it is deleted`,
    );
  }
}

/**
 * An operation was attempted on a workspace that is not deleted.
 */
export class WorkspaceNotDeletedError extends WorkspaceDomainError {
  readonly code = "WORKSPACE_NOT_DELETED";
  readonly errorKind = "conflict" as const;

  constructor(public readonly workspaceId: string) {
    super(`Workspace '${workspaceId}' is not deleted`);
  }
}

/**
 * The actor lacks the required role or permission for the operation.
 */
export class WorkspacePermissionDeniedError extends WorkspaceDomainError {
  readonly code = "WORKSPACE_PERMISSION_DENIED";
  readonly errorKind = "permission_denied" as const;

  constructor(
    public readonly operation: string,
    public readonly actorId: string,
    public readonly workspaceId: string,
    public readonly reason: string,
  ) {
    super(
      `Permission denied: cannot ${operation} workspace '${workspaceId}': ${reason}`,
    );
  }
}

/**
 * Ownership transfer business rules were violated.
 */
export class WorkspaceOwnershipTransferError extends WorkspaceDomainError {
  readonly code = "WORKSPACE_OWNERSHIP_TRANSFER_FAILED";
  readonly errorKind = "permission_denied" as const;

  constructor(
    public readonly workspaceId: string,
    public readonly reason: string,
  ) {
    super(`Cannot transfer ownership of workspace '${workspaceId}': ${reason}`);
  }
}

/**
 * The last owner of a workspace cannot leave or be removed.
 */
export class WorkspaceOwnerRequiredError extends WorkspaceDomainError {
  readonly code = "WORKSPACE_OWNER_REQUIRED";
  readonly errorKind = "conflict" as const;

  constructor(public readonly workspaceId: string) {
    super(`Workspace '${workspaceId}' must have at least one owner`);
  }
}

/**
 * The referenced membership record does not exist.
 */
export class WorkspaceMemberNotFoundError extends WorkspaceDomainError {
  readonly code = "WORKSPACE_MEMBER_NOT_FOUND";
  readonly errorKind = "not_found" as const;

  constructor(
    public readonly workspaceId: string,
    public readonly userId: string,
  ) {
    super(
      `User '${userId}' is not an active member of workspace '${workspaceId}'`,
    );
  }
}

/**
 * The user is already an active member of the workspace.
 */
export class WorkspaceMembershipExistsError extends WorkspaceDomainError {
  readonly code = "WORKSPACE_MEMBERSHIP_EXISTS";
  readonly errorKind = "conflict" as const;

  constructor(
    public readonly workspaceId: string,
    public readonly userId: string,
  ) {
    super(`User '${userId}' is already a member of workspace '${workspaceId}'`);
  }
}

/**
 * Transport-agnostic shape of a single validation violation.
 */
export interface WorkspaceValidationIssue {
  readonly path: string;
  readonly message: string;
}

/**
 * Input failed validation (wraps Zod issues without leaking the Zod type
 * beyond this domain, keeping callers decoupled from the validator).
 */
export class WorkspaceValidationError extends WorkspaceDomainError {
  readonly code = "WORKSPACE_VALIDATION_FAILED";
  readonly errorKind = "validation" as const;

  constructor(
    message: string,
    public readonly issues: readonly WorkspaceValidationIssue[] = [],
  ) {
    super(message);
  }

  static fromZodIssues(issues: readonly ZodIssue[]): WorkspaceValidationError {
    const mapped: WorkspaceValidationIssue[] = issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const summary =
      mapped.length > 0
        ? mapped[0].message
        : "Workspace input validation failed";
    return new WorkspaceValidationError(summary, mapped);
  }
}

/**
 * An unexpected persistence-layer failure occurred.
 * The original error is retained for logging/observability upstream.
 */
export class WorkspaceInternalError extends WorkspaceDomainError {
  readonly code = "WORKSPACE_INTERNAL_ERROR";
  readonly errorKind = "internal" as const;

  constructor(
    public readonly operation: string,
    public readonly cause?: unknown,
  ) {
    super(`Workspace operation '${operation}' failed unexpectedly`);
  }
}

/**
 * Type guard for workspace domain errors.
 */
export function isWorkspaceDomainError(
  error: unknown,
): error is WorkspaceDomainError {
  return error instanceof WorkspaceDomainError;
}
