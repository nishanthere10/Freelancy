import type { Project, ProjectStatus } from "@repo/database";
import type { ClientRepository } from "../client/repository/client.repository";
import type { WorkspaceMemberRepository } from "../workspace/repository";
import {
  ProjectClientWorkspaceMismatchError,
  ProjectDeletedError,
  ProjectDomainError,
  ProjectInternalError,
  ProjectInvalidStatusTransitionError,
  ProjectNotDeletedError,
  ProjectNotFoundError,
  ProjectPermissionDeniedError,
  ProjectSlugAlreadyExistsError,
  ProjectValidationError,
} from "./project.errors";
import type { IProjectEventEmitter } from "./project.events";
import {
  canChangeProjectStatus,
  canCreateProject,
  canDeleteProject,
  canRestoreProject,
  canUpdateProject,
  canViewProject,
} from "./project.policies";
import type {
  ChangeProjectStatusServiceInput,
  CreateProjectServiceInput,
  ProjectQueryFilters,
  UpdateProjectServiceInput,
} from "./project.types";
import {
  type ProjectRepository,
  slugify,
} from "./repository/project.repository";

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: ProjectDomainError };

function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

function err<T>(error: ProjectDomainError): Result<T> {
  return { success: false, error };
}

export class ProjectService {
  constructor(
    private readonly projectRepo: ProjectRepository,
    private readonly memberRepo: WorkspaceMemberRepository,
    private readonly clientRepo: ClientRepository,
    private readonly eventEmitter: IProjectEventEmitter,
  ) {}

  async createProject(
    input: CreateProjectServiceInput,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<Project>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canCreateProject(membership);
      if (!policy.allowed) {
        return err(
          new ProjectPermissionDeniedError(
            "create",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      // Validate Client belong to Workspace if clientId provided
      if (input.clientId) {
        const client = await this.clientRepo.getById(
          input.clientId,
          workspaceId,
          {
            includeDeleted: true,
          },
        );
        if (!client || client.workspaceId !== workspaceId) {
          return err(
            new ProjectClientWorkspaceMismatchError(
              input.clientId,
              workspaceId,
            ),
          );
        }
      }

      // Validate Dates
      if (input.startDate && input.targetDate) {
        if (new Date(input.targetDate) < new Date(input.startDate)) {
          return err(
            new ProjectValidationError(
              "Target completion date cannot be before start date",
              [
                {
                  path: "targetDate",
                  message: "Target completion date cannot be before start date",
                },
              ],
            ),
          );
        }
      }

      const slug = input.slug ? slugify(input.slug) : slugify(input.name);
      const existingSlug = await this.projectRepo.getBySlug(slug, workspaceId);
      if (existingSlug) {
        return err(new ProjectSlugAlreadyExistsError(slug, workspaceId));
      }

      const project = await this.projectRepo.create({
        ...input,
        slug,
        workspaceId,
        createdBy: actorId,
        updatedBy: actorId,
      });

      await this.eventEmitter.emit({
        type: "project.created",
        projectId: project.id,
        workspaceId: project.workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        project,
      });

      return ok(project);
    } catch (error: unknown) {
      if (error instanceof ProjectDomainError) return err(error);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("already exists")) {
        const slug = input.slug ? slugify(input.slug) : slugify(input.name);
        return err(new ProjectSlugAlreadyExistsError(slug, workspaceId));
      }
      if (msg.includes("Client does not exist")) {
        return err(
          new ProjectClientWorkspaceMismatchError(
            input.clientId || "",
            workspaceId,
          ),
        );
      }
      return err(new ProjectInternalError("createProject", error));
    }
  }

  async getProject(
    projectId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<Project & { clientName?: string | null }>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canViewProject(membership);
      if (!policy.allowed) {
        return err(
          new ProjectPermissionDeniedError(
            "view",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const project = await this.projectRepo.getById(projectId, workspaceId);
      if (!project) {
        return err(new ProjectNotFoundError(projectId));
      }

      return ok(project);
    } catch (error: unknown) {
      if (error instanceof ProjectDomainError) return err(error);
      return err(new ProjectInternalError("getProject", error));
    }
  }

  async listProjects(
    workspaceId: string,
    actorId: string,
    filters?: Omit<ProjectQueryFilters, "workspaceId">,
  ): Promise<Result<Array<Project & { clientName?: string | null }>>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canViewProject(membership);
      if (!policy.allowed) {
        return err(
          new ProjectPermissionDeniedError(
            "list",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const projects = await this.projectRepo.list({
        workspaceId,
        ...filters,
      });

      return ok(projects);
    } catch (error: unknown) {
      if (error instanceof ProjectDomainError) return err(error);
      return err(new ProjectInternalError("listProjects", error));
    }
  }

  async updateProject(
    projectId: string,
    workspaceId: string,
    input: UpdateProjectServiceInput,
    actorId: string,
  ): Promise<Result<Project>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canUpdateProject(membership);
      if (!policy.allowed) {
        return err(
          new ProjectPermissionDeniedError(
            "update",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.projectRepo.getById(projectId, workspaceId, {
        includeDeleted: true,
      });
      if (!existing) {
        return err(new ProjectNotFoundError(projectId));
      }
      if (existing.deletedAt) {
        return err(new ProjectDeletedError(projectId, "update"));
      }

      // Validate Client belongs to Workspace if changing clientId
      if (input.clientId !== undefined && input.clientId !== null) {
        const client = await this.clientRepo.getById(
          input.clientId,
          workspaceId,
          {
            includeDeleted: true,
          },
        );
        if (!client || client.workspaceId !== workspaceId) {
          return err(
            new ProjectClientWorkspaceMismatchError(
              input.clientId,
              workspaceId,
            ),
          );
        }
      }

      // Validate dates
      const effectiveStart =
        input.startDate !== undefined ? input.startDate : existing.startDate;
      const effectiveTarget =
        input.targetDate !== undefined ? input.targetDate : existing.targetDate;
      if (effectiveStart && effectiveTarget) {
        if (new Date(effectiveTarget) < new Date(effectiveStart)) {
          return err(
            new ProjectValidationError(
              "Target completion date cannot be before start date",
              [
                {
                  path: "targetDate",
                  message: "Target completion date cannot be before start date",
                },
              ],
            ),
          );
        }
      }

      let slug: string | undefined;
      if (input.name && input.name !== existing.name) {
        slug = input.slug ? slugify(input.slug) : slugify(input.name);
        const slugCheck = await this.projectRepo.getBySlug(slug, workspaceId);
        if (slugCheck && slugCheck.id !== projectId) {
          return err(new ProjectSlugAlreadyExistsError(slug, workspaceId));
        }
      }

      let completedAt: Date | null | undefined;
      if (input.status && input.status !== existing.status) {
        if (input.status === "completed") {
          completedAt = new Date();
        } else if (existing.status === "completed") {
          completedAt = null;
        }
      }

      const updated = await this.projectRepo.update(projectId, workspaceId, {
        ...input,
        ...(slug ? { slug } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
        updatedBy: actorId,
      });

      await this.eventEmitter.emit({
        type: "project.updated",
        projectId: updated.id,
        workspaceId: updated.workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        project: updated,
        changes: input,
      });

      return ok(updated);
    } catch (error: unknown) {
      if (error instanceof ProjectDomainError) return err(error);
      return err(new ProjectInternalError("updateProject", error));
    }
  }

  async changeProjectStatus(
    projectId: string,
    workspaceId: string,
    input: ChangeProjectStatusServiceInput,
    actorId: string,
  ): Promise<Result<Project>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canChangeProjectStatus(membership);
      if (!policy.allowed) {
        return err(
          new ProjectPermissionDeniedError(
            "change status of",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.projectRepo.getById(projectId, workspaceId, {
        includeDeleted: true,
      });
      if (!existing) {
        return err(new ProjectNotFoundError(projectId));
      }
      if (existing.deletedAt) {
        return err(new ProjectDeletedError(projectId, "change status of"));
      }

      const fromStatus = existing.status;
      const toStatus = input.status;

      if (fromStatus === toStatus) {
        return ok(existing);
      }

      let completedAt: Date | null | undefined;
      if (toStatus === "completed") {
        completedAt = new Date();
      } else if (fromStatus === "completed") {
        completedAt = null;
      }

      const updated = await this.projectRepo.update(projectId, workspaceId, {
        status: toStatus,
        ...(completedAt !== undefined ? { completedAt } : {}),
        updatedBy: actorId,
      });

      await this.eventEmitter.emit({
        type: "project.status_changed",
        projectId: updated.id,
        workspaceId: updated.workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        project: updated,
        fromStatus,
        toStatus,
      });

      return ok(updated);
    } catch (error: unknown) {
      if (error instanceof ProjectDomainError) return err(error);
      return err(new ProjectInternalError("changeProjectStatus", error));
    }
  }

  async deleteProject(
    projectId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<Project>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canDeleteProject(membership);
      if (!policy.allowed) {
        return err(
          new ProjectPermissionDeniedError(
            "delete",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.projectRepo.getById(projectId, workspaceId, {
        includeDeleted: true,
      });
      if (!existing) {
        return err(new ProjectNotFoundError(projectId));
      }
      if (existing.deletedAt) {
        return err(new ProjectDeletedError(projectId, "delete"));
      }

      const deleted = await this.projectRepo.softDelete(
        projectId,
        workspaceId,
        actorId,
      );

      await this.eventEmitter.emit({
        type: "project.deleted",
        projectId: deleted.id,
        workspaceId: deleted.workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        project: deleted,
      });

      return ok(deleted);
    } catch (error: unknown) {
      if (error instanceof ProjectDomainError) return err(error);
      return err(new ProjectInternalError("deleteProject", error));
    }
  }

  async restoreProject(
    projectId: string,
    workspaceId: string,
    actorId: string,
  ): Promise<Result<Project>> {
    try {
      const membership = await this.memberRepo.getByWorkspaceAndUser(
        workspaceId,
        actorId,
      );
      const policy = canRestoreProject(membership);
      if (!policy.allowed) {
        return err(
          new ProjectPermissionDeniedError(
            "restore",
            actorId,
            workspaceId,
            policy.reason,
          ),
        );
      }

      const existing = await this.projectRepo.getById(projectId, workspaceId, {
        includeDeleted: true,
      });
      if (!existing) {
        return err(new ProjectNotFoundError(projectId));
      }
      if (!existing.deletedAt) {
        return err(new ProjectNotDeletedError(projectId));
      }

      const restored = await this.projectRepo.restore(
        projectId,
        workspaceId,
        actorId,
      );

      await this.eventEmitter.emit({
        type: "project.restored",
        projectId: restored.id,
        workspaceId: restored.workspaceId,
        actorId,
        occurredAt: new Date().toISOString(),
        project: restored,
      });

      return ok(restored);
    } catch (error: unknown) {
      if (error instanceof ProjectDomainError) return err(error);
      return err(new ProjectInternalError("restoreProject", error));
    }
  }
}
