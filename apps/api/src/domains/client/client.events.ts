import type { Client } from "@repo/database";

export interface ClientDomainEventBase {
  readonly type: string;
  readonly clientId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly occurredAt: string;
}

export interface ClientCreatedEvent extends ClientDomainEventBase {
  readonly type: "client.created";
  readonly client: Client;
}

export interface ClientUpdatedEvent extends ClientDomainEventBase {
  readonly type: "client.updated";
  readonly client: Client;
  readonly changes: Partial<Client>;
}

export interface ClientDeletedEvent extends ClientDomainEventBase {
  readonly type: "client.deleted";
  readonly client: Client;
}

export interface ClientRestoredEvent extends ClientDomainEventBase {
  readonly type: "client.restored";
  readonly client: Client;
}

export type ClientDomainEvent =
  | ClientCreatedEvent
  | ClientUpdatedEvent
  | ClientDeletedEvent
  | ClientRestoredEvent;

export interface IClientEventEmitter {
  emit(event: ClientDomainEvent): Promise<void>;
}

export class NullClientEventEmitter implements IClientEventEmitter {
  async emit(_event: ClientDomainEvent): Promise<void> {
    // No-op implementation for MVP
  }
}
