/**
 * Workspace service tests
 *
 * In-memory fakes for repos; no database. Each test case covers one scenario
 * and verifies domain logic (policies, events, state transitions).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@repo/database';
import { WorkspaceService, type Result } from '../workspace.service';
import type { IWorkspaceEventEmitter, WorkspaceDomainEvent } from '../workspace.events';
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from '../workspace.types';
import type { WorkspaceRepository } from '../repository';
import type { WorkspaceMemberRepository } from '../repository';

/**
 * Fake workspace repository for testing.
 * No database; stores in-memory.
 */
class FakeWorkspaceRepository implements WorkspaceRepository {
  private workspaces: Map<string, Workspace> = new Map();
  private nextId = 1;

  async create(data: CreateWorkspaceInput): Promise<Workspace> {
    const id = `ws-${this.nextId++}`;
    const now = new Date();
    const workspace: Workspace = {
      id,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      logo: data.logo || null,
      ownerId: data.ownerId,
      createdBy: data.ownerId,
      createdAt: now,
      updatedAt: now,
      updatedBy: data.ownerId,
      deletedAt: null,
    };
    this.workspaces.set(id, workspace);
    return workspace;
  }

  async getById(id: string, options?: { includeDeleted?: boolean }): Promise<Workspace | null> {
    const ws = this.workspaces.get(id);
    if (!ws) return null;
    if (!options?.includeDeleted && ws.deletedAt) return null;
    return ws;
  }

  async getBySlug(slug: string, options?: { includeDeleted?: boolean }): Promise<Workspace | null> {
    for (const ws of this.workspaces.values()) {
      if (ws.slug === slug) {
        if (!options?.includeDeleted && ws.deletedAt) return null;
        return ws;
      }
    }
    return null;
  }

  async list(): Promise<Workspace[]> {
    return Array.from(this.workspaces.values()).filter((ws) => !ws.deletedAt);
  }

  async update(
    id: string,
    data: UpdateWorkspaceInput,
    updatedBy: string
  ): Promise<Workspace> {
    const ws = this.workspaces.get(id);
    if (!ws || ws.deletedAt) {
      throw new Error(`Workspace ${id} not found or deleted`);
    }
    const updated: Workspace = {
      ...ws,
      ...data,
      updatedAt: new Date(),
      updatedBy,
    };
    this.workspaces.set(id, updated);
    return updated;
  }

  async updateOwner(id: string, newOwnerId: string, updatedBy: string): Promise<Workspace> {
    const ws = this.workspaces.get(id);
    if (!ws || ws.deletedAt) {
      throw new Error(`Workspace ${id} not found or deleted`);
    }
    const updated: Workspace = {
      ...ws,
      ownerId: newOwnerId,
      updatedAt: new Date(),
      updatedBy,
    };
    this.workspaces.set(id, updated);
    return updated;
  }

  async softDelete(id: string, deletedBy: string): Promise<Workspace> {
    const ws = this.workspaces.get(id);
    if (!ws) {
      throw new Error(`Workspace ${id} not found`);
    }
    const deleted: Workspace = {
      ...ws,
      deletedAt: new Date(),
      updatedBy: deletedBy,
      updatedAt: new Date(),
    };
    this.workspaces.set(id, deleted);
    return deleted;
  }

  async restore(id: string, restoredBy: string): Promise<Workspace> {
    const ws = this.workspaces.get(id);
    if (!ws || !ws.deletedAt) {
      throw new Error(`Deleted workspace ${id} not found`);
    }
    const restored: Workspace = {
      ...ws,
      deletedAt: null,
      updatedBy: restoredBy,
      updatedAt: new Date(),
    };
    this.workspaces.set(id, restored);
    return restored;
  }

  async exists(id: string): Promise<boolean> {
    const ws = this.workspaces.get(id);
    return !!ws && !ws.deletedAt;
  }
}

/**
 * Fake workspace member repository for testing.
 */
class FakeMemberRepository implements WorkspaceMemberRepository {
  private members: Map<string, WorkspaceMember> = new Map();
  private nextId = 1;

  async create(data: any): Promise<WorkspaceMember> {
    const id = `mem-${this.nextId++}`;
    const now = new Date();
    const member: WorkspaceMember = {
      id,
      workspaceId: data.workspaceId,
      userId: data.userId,
      role: data.role || 'viewer',
      joinedAt: now,
      invitedBy: data.invitedBy || null,
      leftAt: null,
      deletedAt: null,
      updatedAt: now,
    };
    this.members.set(id, member);
    return member;
  }

  async getById(id: string, options?: { includeDeleted?: boolean }): Promise<WorkspaceMember | null> {
    const mem = this.members.get(id);
    if (!mem) return null;
    if (!options?.includeDeleted && mem.deletedAt) return null;
    return mem;
  }

  async getByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<WorkspaceMember | null> {
    for (const mem of this.members.values()) {
      if (mem.workspaceId === workspaceId && mem.userId === userId) {
        if (!options?.includeDeleted && mem.deletedAt) return null;
        return mem;
      }
    }
    return null;
  }

  async list(filters?: any): Promise<WorkspaceMember[]> {
    return Array.from(this.members.values())
      .filter((mem) => {
        if (filters?.workspaceId && mem.workspaceId !== filters.workspaceId) return false;
        if (filters?.userId && mem.userId !== filters.userId) return false;
        if (filters?.role && mem.role !== filters.role) return false;
        if (filters?.excludeDeleted !== false && mem.deletedAt) return false;
        return true;
      });
  }

  async listByUser(userId: string): Promise<WorkspaceMember[]> {
    return this.list({ userId, excludeDeleted: true });
  }

  async listByWorkspace(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.list({ workspaceId, excludeDeleted: true });
  }

  async update(id: string, data: any): Promise<WorkspaceMember> {
    const mem = this.members.get(id);
    if (!mem || mem.deletedAt) {
      throw new Error(`Member ${id} not found or deleted`);
    }
    const updated: WorkspaceMember = {
      ...mem,
      ...data,
      updatedAt: new Date(),
    };
    this.members.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<WorkspaceMember> {
    const mem = this.members.get(id);
    if (!mem || mem.deletedAt) {
      throw new Error(`Member ${id} not found or deleted`);
    }
    const removed: WorkspaceMember = {
      ...mem,
      deletedAt: new Date(),
      leftAt: new Date(),
      updatedAt: new Date(),
    };
    this.members.set(id, removed);
    return removed;
  }

  async isMember(workspaceId: string, userId: string): Promise<boolean> {
    const mem = await this.getByWorkspaceAndUser(workspaceId, userId);
    return !!mem;
  }

  async getUserRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const mem = await this.getByWorkspaceAndUser(workspaceId, userId);
    return mem?.role || null;
  }

  async countMembers(workspaceId: string): Promise<number> {
    const members = await this.list({ workspaceId, excludeDeleted: true });
    return members.length;
  }
}

/**
 * Event capture for testing.
 */
class TestEventEmitter implements IWorkspaceEventEmitter {
  events: WorkspaceDomainEvent[] = [];

  emit(event: WorkspaceDomainEvent): void {
    this.events.push(event);
  }
}

describe('WorkspaceService', () => {
  let workspaceRepo: FakeWorkspaceRepository;
  let memberRepo: FakeMemberRepository;
  let eventEmitter: TestEventEmitter;
  let service: WorkspaceService;

  // Test UUIDs
  const user1Id = '550e8400-e29b-41d4-a716-446655440001';
  const user2Id = '550e8400-e29b-41d4-a716-446655440002';
  const user99Id = '550e8400-e29b-41d4-a716-446655440099';

  beforeEach(() => {
    workspaceRepo = new FakeWorkspaceRepository();
    memberRepo = new FakeMemberRepository();
    eventEmitter = new TestEventEmitter();
    service = new WorkspaceService(workspaceRepo, memberRepo, eventEmitter);
  });

  describe('createWorkspace', () => {
    it('should create workspace and add creator as owner', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const result = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: 'A test workspace',
          logo: null,
          ownerId: userId,
        },
        userId
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Workspace');
        expect(result.data.ownerId).toBe(userId);
      }

      // Verify creator is owner member
      const membership = await memberRepo.getByWorkspaceAndUser('ws-1', userId);
      expect(membership?.role).toBe('owner');

      // Verify event emitted
      expect(eventEmitter.events).toHaveLength(1);
      expect(eventEmitter.events[0].type).toBe('workspace.created');
    });

    it('should reject invalid input', async () => {
      const result = await service.createWorkspace(
        {
          name: '',
          slug: 'test',
          description: null,
          logo: null,
          ownerId: user1Id,
        },
        user1Id
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WORKSPACE_VALIDATION_FAILED');
      }
    });
  });

  describe('getWorkspace', () => {
    it('should return workspace if user is member', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      const result = await service.getWorkspace(workspaceId, 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Workspace');
      }
    });

    it('should deny access if user is not a member', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      const result = await service.getWorkspace(workspaceId, 'user-2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WORKSPACE_PERMISSION_DENIED');
      }
    });
  });

  describe('updateWorkspace', () => {
    it('should update workspace if actor is editor or owner', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: 'Old description',
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      const result = await service.updateWorkspace(
        workspaceId,
        { description: 'New description' },
        'user-1'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('New description');
      }

      // Verify event
      expect(eventEmitter.events.some((e) => e.type === 'workspace.updated')).toBe(true);
    });

    it('should deny update if actor is viewer', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      // Add user-2 as viewer
      await memberRepo.create({
        workspaceId,
        userId: 'user-2',
        role: 'viewer',
      });

      const result = await service.updateWorkspace(
        workspaceId,
        { name: 'New Name' },
        'user-2'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WORKSPACE_PERMISSION_DENIED');
      }
    });
  });

  describe('deleteWorkspace', () => {
    it('should soft delete if actor is owner', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      const result = await service.deleteWorkspace(workspaceId, 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.deletedAt).not.toBeNull();
      }

      // Verify event
      expect(eventEmitter.events.some((e) => e.type === 'workspace.deleted')).toBe(true);
    });

    it('should deny delete if actor is not owner', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      await memberRepo.create({
        workspaceId,
        userId: 'user-2',
        role: 'editor',
      });

      const result = await service.deleteWorkspace(workspaceId, 'user-2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WORKSPACE_PERMISSION_DENIED');
      }
    });
  });

  describe('transferOwnership', () => {
    it('should transfer ownership to a member', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      // Add user-2 as member
      await memberRepo.create({
        workspaceId,
        userId: 'user-2',
        role: 'editor',
      });

      const result = await service.transferOwnership(workspaceId, 'user-2', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ownerId).toBe('user-2');
      }

      // Verify event
      expect(eventEmitter.events.some((e) => e.type === 'workspace.ownership_transferred')).toBe(
        true
      );
    });

    it('should deny transfer to non-member', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      const result = await service.transferOwnership(workspaceId, 'user-99', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WORKSPACE_OWNERSHIP_TRANSFER_FAILED');
      }
    });
  });

  describe('addMember', () => {
    it('should add member if actor is owner', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      const result = await service.addMember(workspaceId, 'user-2', 'editor', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('editor');
      }

      // Verify event
      expect(eventEmitter.events.some((e) => e.type === 'workspace.member_added')).toBe(true);
    });

    it('should deny add if user already member', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      const result1 = await service.addMember(workspaceId, 'user-2', 'editor', 'user-1');
      expect(result1.success).toBe(true);

      const result2 = await service.addMember(workspaceId, 'user-2', 'viewer', 'user-1');
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.error.code).toBe('WORKSPACE_MEMBERSHIP_EXISTS');
      }
    });
  });

  describe('leaveWorkspace', () => {
    it('should allow non-owner to leave', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      await memberRepo.create({
        workspaceId,
        userId: 'user-2',
        role: 'editor',
      });

      const result = await service.leaveWorkspace(workspaceId, 'user-2');
      expect(result.success).toBe(true);

      // Verify event
      expect(eventEmitter.events.some((e) => e.type === 'workspace.member_removed')).toBe(true);
    });

    it('should deny last owner to leave', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      const result = await service.leaveWorkspace(workspaceId, 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WORKSPACE_PERMISSION_DENIED');
      }
    });
  });

  describe('changeMemberRole', () => {
    it('should change role if actor is owner', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      await memberRepo.create({
        workspaceId,
        userId: 'user-2',
        role: 'viewer',
      });

      const result = await service.changeMemberRole(workspaceId, 'user-2', 'editor', 'user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('editor');
      }

      // Verify event
      expect(eventEmitter.events.some((e) => e.type === 'workspace.member_role_changed')).toBe(
        true
      );
    });

    it('should deny owner changing own role', async () => {
      const created = await service.createWorkspace(
        {
          name: 'Test Workspace',
          slug: 'test-workspace',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      if (!created.success) throw new Error('Create failed');
      const workspaceId = created.data.id;

      const result = await service.changeMemberRole(workspaceId, 'user-1', 'viewer', 'user-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('WORKSPACE_PERMISSION_DENIED');
      }
    });
  });

  describe('listUserWorkspaces', () => {
    it('should return all workspaces user is member of', async () => {
      // Create 2 workspaces
      const created1 = await service.createWorkspace(
        {
          name: 'Workspace 1',
          slug: 'ws-1',
          description: null,
          logo: null,
          ownerId: 'user-1',
        },
        'user-1'
      );

      const created2 = await service.createWorkspace(
        {
          name: 'Workspace 2',
          slug: 'ws-2',
          description: null,
          logo: null,
          ownerId: 'user-2',
        },
        'user-2'
      );

      if (!created1.success || !created2.success) throw new Error('Create failed');

      // Add user-1 to second workspace
      await memberRepo.create({
        workspaceId: created2.data.id,
        userId: 'user-1',
        role: 'editor',
      });

      const result = await service.listUserWorkspaces('user-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });
  });
});
