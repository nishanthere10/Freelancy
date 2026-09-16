import { ProjectDomainError } from "./project.errors";

export class ProjectDeliverableNotFoundError extends ProjectDomainError {
  readonly code = "DELIVERABLE_NOT_FOUND";
  readonly errorKind = "not_found" as const;

  constructor(public readonly deliverableId: string) {
    super(
      `Project deliverable with ID '${deliverableId}' was not found in this project`,
    );
  }
}

export class ProjectDeliverableValidationError extends ProjectDomainError {
  readonly code = "DELIVERABLE_VALIDATION_ERROR";
  readonly errorKind = "validation" as const;

  constructor(
    message: string,
    public readonly details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
  }
}

export class ProjectDeliverablePermissionDeniedError extends ProjectDomainError {
  readonly code = "PERMISSION_DENIED";
  readonly errorKind = "permission_denied" as const;

  constructor(
    public readonly action: string,
    public readonly actorId: string,
    public readonly workspaceId: string,
    reason?: string,
  ) {
    super(
      `User '${actorId}' does not have permission to ${action} deliverables in workspace '${workspaceId}'${
        reason ? `: ${reason}` : ""
      }`,
    );
  }
}
