export type CommunicationErrorKind =
  | "not_found"
  | "conflict"
  | "permission_denied"
  | "validation"
  | "channel_disabled"
  | "provider_error"
  | "invalid_recipient";

export abstract class CommunicationDomainError extends Error {
  abstract readonly code: string;
  abstract readonly errorKind: CommunicationErrorKind;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class CommunicationNotFoundError extends CommunicationDomainError {
  readonly code = "COMMUNICATION_NOT_FOUND";
  readonly errorKind = "not_found" as const;

  constructor(public readonly messageId: string) {
    super(`Communication record with ID '${messageId}' was not found`);
  }
}

export class CommunicationChannelDisabledError extends CommunicationDomainError {
  readonly code = "CHANNEL_DISABLED";
  readonly errorKind = "channel_disabled" as const;

  constructor(public readonly channel: string) {
    super(`Communication channel '${channel}' is currently inactive or disabled`);
  }
}

export class CommunicationPermissionDeniedError extends CommunicationDomainError {
  readonly code = "PERMISSION_DENIED";
  readonly errorKind = "permission_denied" as const;

  constructor(
    public readonly action: string,
    public readonly actorId: string,
    public readonly workspaceId: string,
    reason?: string,
  ) {
    super(
      `User '${actorId}' does not have permission to ${action} communications in workspace '${workspaceId}'${
        reason ? `: ${reason}` : ""
      }`,
    );
  }
}

export class InvalidRecipientError extends CommunicationDomainError {
  readonly code = "INVALID_RECIPIENT";
  readonly errorKind = "invalid_recipient" as const;

  constructor(message: string) {
    super(message);
  }
}

export class ProviderDeliveryError extends CommunicationDomainError {
  readonly code = "PROVIDER_DELIVERY_ERROR";
  readonly errorKind = "provider_error" as const;

  constructor(
    public readonly provider: string,
    message: string,
    public readonly rawError?: unknown,
  ) {
    super(`Failed to send message via ${provider}: ${message}`);
  }
}

export class CommunicationValidationError extends CommunicationDomainError {
  readonly code = "VALIDATION_ERROR";
  readonly errorKind = "validation" as const;

  constructor(message: string) {
    super(message);
  }
}

export class ClientOptedOutError extends CommunicationDomainError {
  readonly code = "CLIENT_OPTED_OUT";
  readonly errorKind = "channel_disabled" as const;

  constructor(
    public readonly clientId: string,
    public readonly channel: string,
  ) {
    super(`Client '${clientId}' has opted out of ${channel} communications`);
  }
}

