export class AiServiceError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(
    message: string,
    statusCode = 500,
    code = "AI_SERVICE_ERROR",
    details?: unknown,
    requestId?: string,
  ) {
    super(message);
    this.name = "AiServiceError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AiTimeoutError extends AiServiceError {
  constructor(message = "AI service request timed out", requestId?: string) {
    super(message, 504, "GATEWAY_TIMEOUT", undefined, requestId);
    this.name = "AiTimeoutError";
  }
}

export class AiServiceUnavailableError extends AiServiceError {
  constructor(message = "AI service is unreachable", requestId?: string) {
    super(message, 503, "SERVICE_UNAVAILABLE", undefined, requestId);
    this.name = "AiServiceUnavailableError";
  }
}
