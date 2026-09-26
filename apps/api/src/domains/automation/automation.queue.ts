import { getWorkerContext } from "../../worker.context";
import { logger } from "../../utils/logger";

export interface AutomationQueueMessage {
  eventId: string;
  workspaceId: string;
  eventType: string;
  attempt: number;
  enqueuedAt: string;
}

export interface IAutomationQueue {
  enqueue(message: AutomationQueueMessage): Promise<void>;
}

export type AutomationProcessorFn = (eventId: string) => Promise<void>;

let globalProcessor: AutomationProcessorFn | null = null;
let queueOverride: IAutomationQueue | null = null;

export function registerAutomationProcessor(fn: AutomationProcessorFn): void {
  globalProcessor = fn;
}

export function setAutomationQueueOverride(queue: IAutomationQueue | null): void {
  queueOverride = queue;
}

export class CloudflareQueueAdapter implements IAutomationQueue {
  constructor(private queueBinding: { send(msg: unknown, opts?: { delaySeconds?: number }): Promise<void> }) {}

  async enqueue(message: AutomationQueueMessage): Promise<void> {
    await this.queueBinding.send(message);
    logger.info("Automation event enqueued to Cloudflare Queue", {
      eventId: message.eventId,
      workspaceId: message.workspaceId,
      eventType: message.eventType,
    });
  }
}

export class WaitUntilQueueAdapter implements IAutomationQueue {
  constructor(
    private waitUntil: (p: Promise<unknown>) => void,
    private processor: AutomationProcessorFn,
  ) {}

  async enqueue(message: AutomationQueueMessage): Promise<void> {
    logger.info("Automation event dispatched via ExecutionContext.waitUntil", {
      eventId: message.eventId,
      workspaceId: message.workspaceId,
    });
    this.waitUntil(
      this.processor(message.eventId).catch((err) => {
        logger.error("ExecutionContext.waitUntil processor failed", {
          eventId: message.eventId,
          error: err instanceof Error ? err.message : String(err),
        });
      }),
    );
  }
}

export class DirectExecutionQueueAdapter implements IAutomationQueue {
  constructor(private processor: AutomationProcessorFn) {}

  async enqueue(message: AutomationQueueMessage): Promise<void> {
    logger.info("Automation event dispatched via DirectExecutionQueueAdapter", {
      eventId: message.eventId,
      workspaceId: message.workspaceId,
    });
    // In local dev/test, execute in background safely without blocking the caller
    Promise.resolve().then(async () => {
      try {
        await this.processor(message.eventId);
      } catch (err) {
        logger.error("DirectExecutionQueueAdapter processor failed", {
          eventId: message.eventId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }
}

export function getAutomationQueue(): IAutomationQueue {
  if (queueOverride) {
    return queueOverride;
  }

  const { env, ctx } = getWorkerContext();

  if (env?.AUTOMATION_QUEUE && typeof env.AUTOMATION_QUEUE.send === "function") {
    return new CloudflareQueueAdapter(env.AUTOMATION_QUEUE);
  }

  if (ctx && typeof ctx.waitUntil === "function" && globalProcessor) {
    return new WaitUntilQueueAdapter((p) => ctx.waitUntil(p), globalProcessor);
  }

  if (globalProcessor) {
    return new DirectExecutionQueueAdapter(globalProcessor);
  }

  // Fallback no-op if processor not yet registered
  return {
    async enqueue(message: AutomationQueueMessage) {
      logger.warn("No queue processor registered, event queued in database only", {
        eventId: message.eventId,
      });
    },
  };
}
