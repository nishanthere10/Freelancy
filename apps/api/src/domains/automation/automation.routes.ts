import { Router } from "express";
import {
  activateAutomation,
  archiveAutomation,
  createAutomation,
  getAutomation,
  listAutomations,
  listRuns,
  pauseAutomation,
  testAutomation,
  updateAutomation,
} from "./automation.controller";

export const automationRouter = Router({ mergeParams: true });

// Mounted at: /api/v1/workspaces/:workspaceId/automations

automationRouter.get("/", listAutomations);
automationRouter.post("/", createAutomation);
automationRouter.get("/:automationId", getAutomation);
automationRouter.patch("/:automationId", updateAutomation);
automationRouter.post("/:automationId/activate", activateAutomation);
automationRouter.post("/:automationId/pause", pauseAutomation);
automationRouter.post("/:automationId/archive", archiveAutomation);
automationRouter.post("/:automationId/test", testAutomation);
automationRouter.get("/:automationId/runs", listRuns);

// Actions Router (Internal)
import { sendEmailAction } from "./actions/send-email.action";
import { sendWhatsAppAction } from "./actions/send-whatsapp.action";

export const automationInternalActionsRouter = Router({ mergeParams: true });

automationInternalActionsRouter.post("/send-email", sendEmailAction);
automationInternalActionsRouter.post("/send-whatsapp", sendWhatsAppAction);
