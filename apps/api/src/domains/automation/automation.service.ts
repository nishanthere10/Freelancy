import { AutomationRepository } from "./automation.repository";
import {
  CreateAutomationInput,
  UpdateAutomationInput,
} from "./automation.types";
// Mock compiler and provider will be implemented in later phases
import { N8nWorkflowCompiler } from "./n8n/n8n.workflow.compiler";
import { HttpN8nWorkflowProvider } from "./n8n/n8n.provider";

export class AutomationService {
  private readonly n8nCompiler: N8nWorkflowCompiler;
  private readonly n8nProvider: HttpN8nWorkflowProvider;

  constructor(private readonly repository: AutomationRepository) {
    this.n8nCompiler = new N8nWorkflowCompiler();
    this.n8nProvider = new HttpN8nWorkflowProvider();
  }

  async createAutomation(input: CreateAutomationInput) {
    // 1. Create the automation in draft state
    return this.repository.createAutomation(input);
  }

  async getAutomation(workspaceId: string, automationId: string) {
    const automation = await this.repository.getAutomation(workspaceId, automationId);
    if (!automation) {
      throw new Error("Automation not found");
    }
    return automation;
  }

  async listAutomations(workspaceId: string) {
    return this.repository.listAutomations(workspaceId);
  }

  async updateAutomation(
    workspaceId: string,
    automationId: string,
    input: UpdateAutomationInput
  ) {
    const existing = await this.getAutomation(workspaceId, automationId);
    
    // Recalculate hash if config changed. For now we use a naive update.
    const updated = await this.repository.updateAutomation(workspaceId, automationId, input);

    // If active and hash changed, we would need to trigger recompilation/sync in n8n.
    return updated;
  }

  async activateAutomation(workspaceId: string, automationId: string) {
    const automation = await this.getAutomation(workspaceId, automationId);
    if (automation.status === "active") {
      return automation; // Already active
    }

    // 1. Compile to n8n workflow
    const compiledWorkflow = this.n8nCompiler.compile(automation);

    // 2. Deploy to n8n
    const n8nResult = await this.n8nProvider.upsertWorkflow(compiledWorkflow, automation.n8nWorkflowId || undefined);
    
    // 3. Activate in n8n
    await this.n8nProvider.activateWorkflow(n8nResult.id);

    // 4. Update local DB
    await this.repository.updateN8nWorkflow(workspaceId, automationId, n8nResult.id, "1");
    return this.repository.updateStatus(workspaceId, automationId, "active");
  }

  async pauseAutomation(workspaceId: string, automationId: string) {
    const automation = await this.getAutomation(workspaceId, automationId);
    if (automation.status !== "active") {
      throw new Error("Automation is not active");
    }

    if (automation.n8nWorkflowId) {
      await this.n8nProvider.deactivateWorkflow(automation.n8nWorkflowId);
    }

    return this.repository.updateStatus(workspaceId, automationId, "paused");
  }

  async archiveAutomation(workspaceId: string, automationId: string) {
    const automation = await this.getAutomation(workspaceId, automationId);
    if (automation.status === "active") {
      throw new Error("Cannot archive an active automation. Pause it first.");
    }

    return this.repository.updateStatus(workspaceId, automationId, "archived");
  }

  async getRuns(workspaceId: string, automationId: string) {
    // Verify it exists in workspace
    await this.getAutomation(workspaceId, automationId);
    return this.repository.listRuns(workspaceId, automationId);
  }
}
