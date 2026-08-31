/**
 * Security Context Payload forwarded to the AI Microservice.
 * Cloudflare Workers API verifies Clerk JWT + Workspace RBAC before creating this payload.
 */
export interface AiRequestPayload<T = unknown> {
  workspaceId: string;
  actorId: string;
  actorRole: string;
  requestId: string;
  input: T;
}

/**
 * Standard envelope returned by the AI service
 */
export interface AiResponseEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: unknown;
  requestId?: string;
}

export interface AiClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}
