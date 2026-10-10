import crypto from "crypto";
import { AutomationDispatcher } from "./automation.dispatcher";
import type {
  AutomationEventContext,
  AutomationEventV1,
  SupportedAutomationEvents,
} from "./automation.events";
import { logger } from "../../utils/logger";

export interface BridgeEmitOptions {
  workspaceId: string;
  actorId?: string | null;
  entity: {
    type: AutomationEventV1["entity"]["type"];
    id: string;
  };
  context?: AutomationEventContext;
  data?: Record<string, any>;
}

export class AutomationEventBridge {
  private static instance: AutomationEventBridge;
  private readonly dispatcher: AutomationDispatcher;

  constructor(dispatcher?: AutomationDispatcher) {
    this.dispatcher = dispatcher ?? new AutomationDispatcher();
  }

  public static getInstance(): AutomationEventBridge {
    if (!AutomationEventBridge.instance) {
      AutomationEventBridge.instance = new AutomationEventBridge();
    }
    return AutomationEventBridge.instance;
  }

  public async emit(
    eventType: SupportedAutomationEvents,
    options: BridgeEmitOptions,
  ): Promise<void> {
    try {
      const event: AutomationEventV1 = {
        version: 1,
        eventId: crypto.randomUUID(),
        eventType,
        occurredAt: new Date().toISOString(),
        workspaceId: options.workspaceId,
        actorId: options.actorId ?? null,
        entity: options.entity,
        context: options.context,
        data: options.data,
      };

      await this.dispatcher.dispatchEvent(event);
      logger.debug("AutomationEventBridge: Dispatched event", {
        eventType,
        workspaceId: options.workspaceId,
        entityId: options.entity.id,
      });
    } catch (err) {
      // Non-blocking: failures in automation dispatch must never abort user transactions
      logger.error("AutomationEventBridge: Failed to dispatch event", {
        eventType,
        workspaceId: options.workspaceId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
