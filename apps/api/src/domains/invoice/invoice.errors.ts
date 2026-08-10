import type { ZodIssue } from "zod";

export type InvoiceErrorKind =
  | "not_found"
  | "conflict"
  | "permission_denied"
  | "validation"
  | "internal";

export abstract class InvoiceDomainError extends Error {
  abstract readonly code: string;
  abstract readonly errorKind: InvoiceErrorKind;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvoiceNotFoundError extends InvoiceDomainError {
  readonly code = "INVOICE_NOT_FOUND";
  readonly errorKind = "not_found" as const;

  constructor(public readonly invoiceId: string) {
    super(`Invoice with id '${invoiceId}' was not found`);
  }
}

export class InvoiceNumberAlreadyExistsError extends InvoiceDomainError {
  readonly code = "INVOICE_NUMBER_ALREADY_EXISTS";
  readonly errorKind = "conflict" as const;

  constructor(
    public readonly invoiceNumber: string,
    public readonly workspaceId: string,
  ) {
    super(
      `Invoice with number '${invoiceNumber}' already exists in workspace '${workspaceId}'`,
    );
  }
}

export class InvoiceImmutableError extends InvoiceDomainError {
  readonly code = "INVOICE_IMMUTABLE";
  readonly errorKind = "conflict" as const;

  constructor(
    public readonly invoiceId: string,
    public readonly status: string,
    public readonly operation: string,
  ) {
    super(
      `Cannot ${operation} invoice '${invoiceId}' because it is in '${status}' status and is locked`,
    );
  }
}

export class InvoiceDraftOnlyDeleteError extends InvoiceDomainError {
  readonly code = "INVOICE_DRAFT_ONLY_DELETE";
  readonly errorKind = "conflict" as const;

  constructor(
    public readonly invoiceId: string,
    public readonly status: string,
  ) {
    super(
      `Cannot delete invoice '${invoiceId}' because it is in '${status}' status. Only draft invoices can be deleted`,
    );
  }
}

export class InvoiceInvalidStatusTransitionError extends InvoiceDomainError {
  readonly code = "INVOICE_INVALID_STATUS_TRANSITION";
  readonly errorKind = "conflict" as const;

  constructor(
    public readonly invoiceId: string,
    public readonly currentStatus: string,
    public readonly targetStatus: string,
  ) {
    super(
      `Cannot transition invoice '${invoiceId}' from '${currentStatus}' to '${targetStatus}'`,
    );
  }
}

export class InvoiceClientMismatchError extends InvoiceDomainError {
  readonly code = "INVOICE_CLIENT_MISMATCH";
  readonly errorKind = "conflict" as const;

  constructor(
    public readonly clientId: string,
    public readonly workspaceId: string,
  ) {
    super(
      `Client '${clientId}' does not exist or does not belong to workspace '${workspaceId}'`,
    );
  }
}

export class InvoiceProjectMismatchError extends InvoiceDomainError {
  readonly code = "INVOICE_PROJECT_MISMATCH";
  readonly errorKind = "conflict" as const;

  constructor(
    public readonly projectId: string,
    public readonly workspaceId: string,
  ) {
    super(
      `Project '${projectId}' does not exist or does not belong to workspace '${workspaceId}'`,
    );
  }
}

export class InvoicePermissionDeniedError extends InvoiceDomainError {
  readonly code = "INVOICE_PERMISSION_DENIED";
  readonly errorKind = "permission_denied" as const;

  constructor(
    public readonly operation: string,
    public readonly actorId: string,
    public readonly workspaceId: string,
    public readonly reason: string,
  ) {
    super(
      `Permission denied: cannot ${operation} invoice in workspace '${workspaceId}': ${reason}`,
    );
  }
}

export interface InvoiceValidationIssue {
  readonly path: string;
  readonly message: string;
}

export class InvoiceValidationError extends InvoiceDomainError {
  readonly code = "INVOICE_VALIDATION_FAILED";
  readonly errorKind = "validation" as const;

  constructor(
    message: string,
    public readonly issues: readonly InvoiceValidationIssue[] = [],
  ) {
    super(message);
  }

  static fromZodIssues(issues: readonly ZodIssue[]): InvoiceValidationError {
    const mapped: InvoiceValidationIssue[] = issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const summary =
      mapped.length > 0 ? mapped[0].message : "Invoice input validation failed";
    return new InvoiceValidationError(summary, mapped);
  }
}

export class InvoiceInternalError extends InvoiceDomainError {
  readonly code = "INVOICE_INTERNAL_ERROR";
  readonly errorKind = "internal" as const;

  constructor(
    public readonly operation: string,
    public readonly cause?: unknown,
  ) {
    super(`Invoice operation '${operation}' failed unexpectedly`);
  }
}

export function isInvoiceDomainError(
  error: unknown,
): error is InvoiceDomainError {
  return error instanceof InvoiceDomainError;
}
