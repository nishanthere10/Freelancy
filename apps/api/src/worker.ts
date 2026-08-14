/**
 * Cloudflare Worker Entrypoint
 * Bridges Web API Fetch Requests into the Express application pipeline using Node.js compatibility.
 */

import http from "node:http";
import type { Socket } from "node:net";
import type {
  ExecutionContext,
  Request as WorkerRequest,
} from "@cloudflare/workers-types";
import type { Application } from "express";
import app from "./app";

type ExpressRunner = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: (err?: unknown) => void,
) => void;

/**
 * Executes a Web API Request through the Express pipeline using node:http primitives
 */
export async function handleExpressRequest(
  expressApp: Application | ExpressRunner,
  request: WorkerRequest,
): Promise<Response> {
  const url = new URL(request.url);
  const bodyBuffer = request.body
    ? Buffer.from(await request.arrayBuffer())
    : null;

  return new Promise((resolve, reject) => {
    try {
      const req = new http.IncomingMessage({} as unknown as Socket);
      req.method = request.method;
      req.url = url.pathname + url.search;

      // Copy headers from Worker Request to Express req
      request.headers.forEach((value: string, key: string) => {
        req.headers[key.toLowerCase()] = value;
      });

      const res = new http.ServerResponse(req);
      const responseHeaders = new Headers();
      let statusCode = 200;
      const chunks: Uint8Array[] = [];

      res.writeHead = (
        code: number,
        reasonOrHeaders?:
          | string
          | http.OutgoingHttpHeaders
          | http.OutgoingHttpHeader[],
        rawHeaders?: http.OutgoingHttpHeaders | http.OutgoingHttpHeader[],
      ): http.ServerResponse => {
        statusCode = code;
        const headers =
          typeof reasonOrHeaders === "object" ? reasonOrHeaders : rawHeaders;
        if (headers) {
          if (Array.isArray(headers)) {
            for (let i = 0; i < headers.length; i += 2) {
              const k = String(headers[i]);
              const v = String(headers[i + 1]);
              responseHeaders.append(k, v);
            }
          } else {
            for (const [k, v] of Object.entries(headers)) {
              if (Array.isArray(v)) {
                for (const val of v) {
                  responseHeaders.append(k, String(val));
                }
              } else if (v !== undefined) {
                responseHeaders.set(k, String(v));
              }
            }
          }
        }
        return res;
      };

      res.setHeader = (
        name: string,
        value: number | string | readonly string[],
      ): http.ServerResponse => {
        if (Array.isArray(value)) {
          responseHeaders.delete(name);
          for (const v of value) {
            responseHeaders.append(name, String(v));
          }
        } else {
          responseHeaders.set(name, String(value));
        }
        return res;
      };

      res.getHeader = (name: string): string | undefined =>
        responseHeaders.get(name) || undefined;

      res.write = (
        chunk: Uint8Array | string,
        _encodingOrCb?: BufferEncoding | ((error?: Error | null) => void),
        _cb?: (error?: Error | null) => void,
      ): boolean => {
        if (chunk) {
          chunks.push(
            typeof chunk === "string"
              ? Buffer.from(chunk)
              : new Uint8Array(chunk),
          );
        }
        return true;
      };

      res.end = (
        chunkOrCb?: Uint8Array | string | (() => void),
        encodingOrCb?: BufferEncoding | (() => void),
        cb?: () => void,
      ): http.ServerResponse => {
        let content: Uint8Array | string | undefined;
        let callback: (() => void) | undefined;

        if (typeof chunkOrCb === "function") {
          callback = chunkOrCb;
        } else {
          content = chunkOrCb;
          if (typeof encodingOrCb === "function") {
            callback = encodingOrCb;
          } else {
            callback = cb;
          }
        }

        if (content) {
          chunks.push(
            typeof content === "string"
              ? Buffer.from(content)
              : new Uint8Array(content),
          );
        }

        const combinedBody = Buffer.concat(chunks);
        const finalStatus =
          res.statusCode && res.statusCode !== 200
            ? res.statusCode
            : statusCode;
        const response = new Response(combinedBody, {
          status: finalStatus,
          headers: responseHeaders,
        });
        resolve(response);
        if (callback) callback();
        return res;
      };

      // Inject request body into req stream
      if (bodyBuffer && bodyBuffer.length > 0) {
        req.push(bodyBuffer);
      }
      req.push(null);

      expressApp(req, res, (err: unknown) => {
        if (err) {
          // Instead of rejecting the promise, format a proper 500 response with CORS
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", request.headers.get("origin") || "*");
          res.setHeader("Access-Control-Allow-Credentials", "true");
          res.end(
            JSON.stringify({
              success: false,
              error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "An unexpected error occurred" },
            })
          );
          return;
        }
        // If Express finishes routing without matching a route, send 404
        if (!res.writableEnded) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Access-Control-Allow-Origin", request.headers.get("origin") || "*");
          res.setHeader("Access-Control-Allow-Credentials", "true");
          res.end(
            JSON.stringify({
              success: false,
              error: { code: "NOT_FOUND", message: "Route not found" },
            }),
          );
        }
      });
    } catch (err) {
      const origin = request.headers.get("origin") || "*";
      const headers = new Headers({
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      });
      resolve(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : String(err) },
          }),
          { status: 500, headers }
        )
      );
    }
  });
}

export default {
  async fetch(
    request: WorkerRequest,
    env: Record<string, string>,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    try {
      if (env) {
        for (const [key, value] of Object.entries(env)) {
          if (typeof value === "string") {
            process.env[key] = value;
          }
        }
      }

      // Startup Check: Validate critical environment variables
      const missingVars: string[] = [];
      if (process.env.NODE_ENV !== "test") {
        if (!process.env.DATABASE_URL) missingVars.push("DATABASE_URL");
        if (!process.env.CLERK_SECRET_KEY) missingVars.push("CLERK_SECRET_KEY");
        if (!process.env.CLERK_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
          missingVars.push("CLERK_PUBLISHABLE_KEY");
        }
      }

      if (missingVars.length > 0) {
        const origin = request.headers.get("origin") || "*";
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "CONFIGURATION_ERROR",
              message: `Missing critical environment variables: ${missingVars.join(", ")}`,
            },
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": origin,
              "Access-Control-Allow-Credentials": "true",
            },
          }
        );
      }

      return await handleExpressRequest(app, request);
    } catch (err) {
      const origin = request.headers.get("origin") || "*";
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : String(err) },
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
          },
        }
      );
    }
  },
};
