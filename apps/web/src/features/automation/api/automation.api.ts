import { apiGet, apiPatch, apiPost } from "@api/client";
import { CreateAutomationFormValues } from "../automation.schemas";

export const automationApi = {
  listAutomations: async (workspaceId: string) => {
    return await apiGet(`/workspaces/${workspaceId}/automations`);
  },

  getAutomation: async (workspaceId: string, automationId: string) => {
    return await apiGet(`/workspaces/${workspaceId}/automations/${automationId}`);
  },

  createAutomation: async (
    workspaceId: string,
    data: CreateAutomationFormValues
  ) => {
    return await apiPost(`/workspaces/${workspaceId}/automations`, data);
  },

  updateAutomation: async (
    workspaceId: string,
    automationId: string,
    data: Partial<CreateAutomationFormValues>
  ) => {
    return await apiPatch(
      `/workspaces/${workspaceId}/automations/${automationId}`,
      data
    );
  },

  pauseAutomation: async (workspaceId: string, automationId: string) => {
    return await apiPost(
      `/workspaces/${workspaceId}/automations/${automationId}/pause`
    );
  },

  activateAutomation: async (workspaceId: string, automationId: string) => {
    return await apiPost(
      `/workspaces/${workspaceId}/automations/${automationId}/activate`
    );
  },

  testAutomation: async (workspaceId: string, automationId: string) => {
    return await apiPost(
      `/workspaces/${workspaceId}/automations/${automationId}/test`
    );
  },
};
