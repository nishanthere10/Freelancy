/**
 * Structured Application Logger
 * Provides level-gated JSON logging with automated secret redaction for production reliability.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "password",
  "token",
  "secret",
  "clerk_secret_key",
  "clerksecretkey",
  "database_url",
  "databaseurl",
  "api_token",
  "apitoken",
  "apikey",
  "api_key",
  "key",
  "session",
]);

/**
 * Recursively sanitize objects and values, masking sensitive credentials.
 */
export function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[MaxDepth]";
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    // Redact Bearer tokens and connection strings in strings
    if (/bearer\s+[a-zA-Z0-9_\-\.]+/i.test(value)) {
      return value.replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]");
    }
    if (/postgres(ql)?:\/\/[^:]+:[^@]+@/i.test(value)) {
      return value.replace(
        /postgres(ql)?:\/\/([^:]+):([^@]+)@/gi,
        "postgresql://[REDACTED]:[REDACTED]@",
      );
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, depth + 1));
  }

  if (typeof value === "object") {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
        ...(value as unknown as Record<string, unknown>),
      };
    }

    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lowerKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (
        SENSITIVE_KEYS.has(lowerKey) ||
        lowerKey.includes("secret") ||
        lowerKey.includes("password") ||
        lowerKey.includes("token") ||
        lowerKey.includes("apikey")
      ) {
        sanitizedObj[k] = "[REDACTED]";
      } else {
        sanitizedObj[k] = sanitizeLogValue(v, depth + 1);
      }
    }
    return sanitizedObj;
  }

  return value;
}

export interface LogContext {
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  userId?: string;
  workspaceId?: string;
  errorCode?: string;
  [key: string]: unknown;
}

export interface LogEntry extends LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
}

class StructuredLogger {
  private minLevel: LogLevel = "info";

  constructor() {
    const envLevel = (process.env.LOG_LEVEL || "").toLowerCase() as LogLevel;
    if (envLevel in LOG_LEVEL_PRIORITY) {
      this.minLevel = envLevel;
    } else if (process.env.NODE_ENV === "development") {
      this.minLevel = "debug";
    }
  }

  public setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private write(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context ? (sanitizeLogValue(context) as LogContext) : {}),
    };

    const jsonString = JSON.stringify(entry);

    if (level === "error") {
      console.error(jsonString);
    } else if (level === "warn") {
      console.warn(jsonString);
    } else if (level === "debug") {
      console.debug(jsonString);
    } else {
      console.log(jsonString);
    }
  }

  public debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.write("warn", message, context);
  }

  public error(message: string, context?: LogContext): void {
    this.write("error", message, context);
  }
}

export const logger = new StructuredLogger();
