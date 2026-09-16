import { ProjectDomainError } from "./project.errors";

export class ChangeOrderNotFoundError extends ProjectDomainError {
  readonly code = "CHANGE_ORDER_NOT_FOUND";
  readonly errorKind = "not_found" as const;

  constructor(public readonly changeOrderId: string) {
    super(
      `Change order with ID '${changeOrderId}' was not found in this project`,
    );
  }
}

export class ChangeOrderConflictError extends ProjectDomainError {
  readonly code = "CHANGE_ORDER_CONFLICT";
  readonly errorKind = "conflict" as const;
}

export class ChangeOrderValidationError extends ProjectDomainError {
  readonly code = "CHANGE_ORDER_VALIDATION_ERROR";
  readonly errorKind = "validation" as const;

  constructor(
    message: string,
    public readonly details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

export class ChangeOrderPermissionDeniedError extends ProjectDomainError {
  readonly code = "PERMISSION_DENIED";
  readonly errorKind = "permission_denied" as const;

  constructor(
    public readonly action: string,
    public readonly actorId: string,
    public readonly workspaceId: string,
    reason?: string,
  ) {
    super(
      `User '${actorId}' does not have permission to ${action} change orders in workspace '${workspaceId}'${
        reason ? `: ${reason}` : ""
      }`,
    );
  }
}

export class InvalidProjectStateError extends ProjectDomainError {
  readonly code = "INVALID_PROJECT_STATE";
  readonly errorKind = "invalid_transition" as const;
}
