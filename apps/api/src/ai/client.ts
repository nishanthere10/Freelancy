import { config } from "../config";
import {
  AiServiceError,
  AiServiceUnavailableError,
  AiTimeoutError,
} from "./errors";
import type {
  AiClientOptions,
  AiRequestPayload,
  AiResponseEnvelope,
} from "./types";

export class AiServiceClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultTimeoutMs: number;

  constructor(options?: AiClientOptions) {
    this.baseUrl = (options?.baseUrl || config.aiServiceUrl).replace(
      /\/+$/,
      "",
    );
    this.apiKey = options?.apiKey || config.aiServiceApiKey;
    this.defaultTimeoutMs = options?.timeoutMs ?? 30000;
  }

  /**
   * Health check probe for AI microservice (unauthenticated)
   */
  async checkHealth(options?: { timeoutMs?: number }): Promise<{
    status: string;
    service?: string;
  }> {
    const url = `${this.baseUrl}/health`;
    const timeoutMs = options?.timeoutMs ?? 5000;

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new AiServiceError(
          `AI service health check failed with status ${response.status}`,
          response.status,
          "HEALTH_CHECK_FAILED",
        );
      }

      return (await response.json()) as { status: string; service?: string };
    } catch (err: unknown) {
      if (err instanceof AiServiceError) throw err;
      if (this.isTimeoutError(err)) {
        throw new AiTimeoutError("AI health check timed out");
      }
      throw new AiServiceUnavailableError(
        err instanceof Error ? err.message : "Failed to reach AI service",
      );
    }
  }

  /**
   * Send a trusted POST request to the AI microservice
   */
  async post<TInput, TOutput>(
    path: string,
    payload: AiRequestPayload<TInput>,
    options?: { timeoutMs?: number },
  ): Promise<TOutput> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "x-request-id": payload.requestId,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err: unknown) {
      if (this.isTimeoutError(err)) {
        throw new AiTimeoutError(
          `AI service request timed out after ${timeoutMs}ms`,
          payload.requestId,
        );
      }
      throw new AiServiceUnavailableError(
        `Unable to connect to AI service: ${err instanceof Error ? err.message : "Network error"}`,
        payload.requestId,
      );
    }

    let responseBody: AiResponseEnvelope<TOutput>;
    try {
      const parsed = (await response.json()) as unknown;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid response format");
      }
      responseBody = parsed as AiResponseEnvelope<TOutput>;
    } catch {
      if (!response.ok) {
        throw new AiServiceError(
          `AI service returned HTTP ${response.status}`,
          response.status,
          "AI_HTTP_ERROR",
          undefined,
          payload.requestId,
        );
      }
      throw new AiServiceError(
        "Invalid JSON response from AI service",
        502,
        "BAD_GATEWAY",
        undefined,
        payload.requestId,
      );
    }

    if (!response.ok || responseBody.success === false) {
      const statusCode = response.status >= 400 ? response.status : 500;
      const errorCode = responseBody.error || "AI_SERVICE_ERROR";
      const message = responseBody.message || "AI service operation failed";
      throw new AiServiceError(
        message,
        statusCode,
        errorCode,
        responseBody.details,
        responseBody.requestId || payload.requestId,
      );
    }

    return responseBody.data !== undefined
      ? (responseBody.data as TOutput)
      : (responseBody as unknown as TOutput);
  }

  /**
   * Triggers background ingestion of workspace projects into Chroma RAG store
   */
  async triggerWorkspaceIngest(
    workspaceId: string,
    options?: { timeoutMs?: number },
  ): Promise<{
    success: boolean;
    data?: { workspaceId: string; indexedCount: number };
  }> {
    const url = `${this.baseUrl}/api/v1/ingest/workspace/${encodeURIComponent(workspaceId)}`;
    const timeoutMs = options?.timeoutMs ?? 10000;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        return { success: false };
      }

      const body = (await response.json()) as {
        success: boolean;
        data?: { workspaceId: string; indexedCount: number };
      };
      return body;
    } catch {
      return { success: false };
    }
  }

  private isTimeoutError(err: unknown): boolean {
    if (err instanceof Error) {
      return (
        err.name === "TimeoutError" ||
        err.name === "AbortError" ||
        err.message.toLowerCase().includes("timeout") ||
        err.message.toLowerCase().includes("aborted")
      );
    }
    return false;
  }
}

export const aiServiceClient = new AiServiceClient();
