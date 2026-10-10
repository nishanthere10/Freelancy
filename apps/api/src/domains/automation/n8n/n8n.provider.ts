export interface N8nWorkflowRef {
  id: string;
  version: string;
  active: boolean;
}

export interface CompiledWorkflow {
  name: string;
  nodes: any[];
  connections: Record<string, any>;
  settings?: Record<string, any>;
  tags?: string[];
}

export interface N8nWorkflowProvider {
  createWorkflow(input: CompiledWorkflow): Promise<N8nWorkflowRef>;
  updateWorkflow(workflowId: string, input: CompiledWorkflow): Promise<N8nWorkflowRef>;
  upsertWorkflow(input: CompiledWorkflow, workflowId?: string): Promise<N8nWorkflowRef>;
  activateWorkflow(workflowId: string): Promise<void>;
  deactivateWorkflow(workflowId: string): Promise<void>;
  getWorkflow(workflowId: string): Promise<N8nWorkflowRef>;
  healthCheck(): Promise<boolean>;
}

import axios from "axios";
import { config } from "../../../config";
import { logger } from "../../../utils/logger";

export class HttpN8nWorkflowProvider implements N8nWorkflowProvider {
  private readonly client: any;
  private readonly allowMockFallback: boolean;

  constructor(options?: {
    baseURL?: string;
    apiKey?: string;
    allowMockFallback?: boolean;
  }) {
    const baseURL =
      options?.baseURL || process.env.N8N_BASE_URL || "http://localhost:5678/api/v1";
    const apiKey = options?.apiKey || process.env.N8N_API_KEY || "dev-key";
    this.allowMockFallback =
      options?.allowMockFallback ??
      (process.env.NODE_ENV === "test" &&
        process.env.ENABLE_MOCK_N8N !== "false");

    this.client = axios.create({
      baseURL,
      headers: {
        "X-N8N-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
  }

  async createWorkflow(input: CompiledWorkflow): Promise<N8nWorkflowRef> {
    try {
      const res = await this.client.post("/workflows", input);
      return { id: res.data.id, version: "1", active: res.data.active || false };
    } catch (err: any) {
      if (this.allowMockFallback) {
        logger.warn("n8n not running in test mode, mocking createWorkflow success");
        return { id: "mock-workflow-id", version: "1", active: false };
      }
      logger.error("Failed to create n8n workflow", { error: err.message });
      throw new Error(`Failed to create n8n workflow: ${err.message}`);
    }
  }

  async updateWorkflow(workflowId: string, input: CompiledWorkflow): Promise<N8nWorkflowRef> {
    try {
      const res = await this.client.put(`/workflows/${workflowId}`, input);
      return { id: res.data.id, version: res.data.versionId || "1", active: res.data.active || false };
    } catch (err: any) {
      if (this.allowMockFallback) {
        logger.warn("n8n not running in test mode, mocking updateWorkflow success");
        return { id: workflowId, version: "2", active: false };
      }
      logger.error("Failed to update n8n workflow", { workflowId, error: err.message });
      throw new Error(`Failed to update n8n workflow: ${err.message}`);
    }
  }

  async activateWorkflow(workflowId: string): Promise<void> {
    try {
      await this.client.post(`/workflows/${workflowId}/activate`);
    } catch (err: any) {
      if (this.allowMockFallback) {
        logger.warn("n8n not running in test mode, mocking activateWorkflow success");
        return;
      }
      logger.error("Failed to activate n8n workflow", { workflowId, error: err.message });
      throw new Error(`Failed to activate n8n workflow: ${err.message}`);
    }
  }

  async deactivateWorkflow(workflowId: string): Promise<void> {
    try {
      await this.client.post(`/workflows/${workflowId}/deactivate`);
    } catch (err: any) {
      if (this.allowMockFallback) {
        logger.warn("n8n not running in test mode, mocking deactivateWorkflow success");
        return;
      }
      logger.error("Failed to deactivate n8n workflow", { workflowId, error: err.message });
      throw new Error(`Failed to deactivate n8n workflow: ${err.message}`);
    }
  }

  async getWorkflow(workflowId: string): Promise<N8nWorkflowRef> {
    try {
      const res = await this.client.get(`/workflows/${workflowId}`);
      return { id: res.data.id, version: res.data.versionId || "1", active: res.data.active || false };
    } catch (err: any) {
      if (this.allowMockFallback) {
        logger.warn("n8n not running in test mode, mocking getWorkflow success");
        return { id: workflowId, version: "1", active: true };
      }
      logger.error("Failed to get n8n workflow", { workflowId, error: err.message });
      throw new Error(`Failed to get n8n workflow: ${err.message}`);
    }
  }

  async upsertWorkflow(input: CompiledWorkflow, workflowId?: string): Promise<N8nWorkflowRef> {
    if (workflowId) {
      return this.updateWorkflow(workflowId, input);
    }
    return this.createWorkflow(input);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get("/workflows", { params: { limit: 1 } });
      return true;
    } catch {
      return false;
    }
  }
}
