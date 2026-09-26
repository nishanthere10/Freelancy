import type { ExecutionContext } from "@cloudflare/workers-types";
import { AsyncLocalStorage } from "node:async_hooks";

export interface QueueBinding<T = unknown> {
  send(message: T, options?: { delaySeconds?: number }): Promise<void>;
  sendBatch(messages: Iterable<{ body: T; delaySeconds?: number }>): Promise<void>;
}

export interface WorkerEnv extends Record<string, unknown> {
  AUTOMATION_QUEUE?: QueueBinding;
  DATABASE_URL?: string;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  FRONTEND_URL?: string;
  NODE_ENV?: string;
}

export interface WorkerContextState {
  env?: WorkerEnv;
  ctx?: ExecutionContext;
}

const workerContextStorage = new AsyncLocalStorage<WorkerContextState>();
let fallbackContext: WorkerContextState = {};

export function setWorkerContext(state: WorkerContextState): void {
  fallbackContext = { ...fallbackContext, ...state };
}

export function runWithWorkerContext<T>(
  state: WorkerContextState,
  fn: () => T,
): T {
  setWorkerContext(state);
  return workerContextStorage.run(state, fn);
}

export function getWorkerContext(): WorkerContextState {
  return workerContextStorage.getStore() ?? fallbackContext;
}
