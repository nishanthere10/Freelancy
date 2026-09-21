import { config } from "../../../../config";
import { CompiledWorkflow } from "./n8n.provider";

export class N8nWorkflowCompiler {
  /**
   * Compiles an internal automation record into an n8n workflow graph.
   * This is a simplified compiler for Phase 4.
   */
  compile(automation: any): CompiledWorkflow {
    const nodes: any[] = [];
    const connections: Record<string, any> = {};

    let currentId = 1;
    let previousNodeName = "";

    // 1. Add Trigger Node
    const triggerConfig = automation.triggerConfig;
    if (triggerConfig.type === "event") {
      // Use Webhook Node for event triggers
      const nodeName = "Webhook Trigger";
      nodes.push({
        parameters: {
          path: `automation-trigger-${automation.id}`,
          options: {},
        },
        id: (currentId++).toString(),
        name: nodeName,
        type: "n8n-nodes-base.webhook",
        typeVersion: 1,
        position: [100, 300],
      });
      previousNodeName = nodeName;
    } else if (triggerConfig.type === "schedule") {
      // Use Cron Node for schedule triggers
      const nodeName = "Schedule Trigger";
      nodes.push({
        parameters: {
          rule: {
            interval: [{
              field: "cronExpression",
              expression: `0 ${triggerConfig.hour} * * ${triggerConfig.dayOfWeek !== undefined ? triggerConfig.dayOfWeek : "*"}`,
            }],
          },
        },
        id: (currentId++).toString(),
        name: nodeName,
        type: "n8n-nodes-base.cron",
        typeVersion: 1,
        position: [100, 300],
      });
      previousNodeName = nodeName;
    }

    // 2. Add Condition Node (if any)
    if (automation.conditionConfig && automation.conditionConfig.conditions.length > 0) {
      const nodeName = "If Condition";
      // simplified condition check
      nodes.push({
        parameters: {
          conditions: {
            boolean: [],
            number: [],
            string: [
              {
                value1: "={{$json.body.value}}", // Mock value mapping
                operation: "equal",
                value2: "expected",
              }
            ],
          },
        },
        id: (currentId++).toString(),
        name: nodeName,
        type: "n8n-nodes-base.if",
        typeVersion: 1,
        position: [300, 300],
      });
      connections[previousNodeName] = {
        main: [
          [
            {
              node: nodeName,
              type: "main",
              index: 0,
            },
          ],
        ],
      };
      previousNodeName = nodeName;
    }

    // 3. Add Action Nodes
    if (automation.actionConfig && automation.actionConfig.length > 0) {
      automation.actionConfig.forEach((action: any, index: number) => {
        const actionNodeName = `Internal Action ${index + 1}`;
        let endpoint = "";

        if (action.type === "send_email") endpoint = "/api/v1/internal/actions/send-email";
        else if (action.type === "send_whatsapp") endpoint = "/api/v1/internal/actions/send-whatsapp";

        // Map action to HTTP Request node calling our internal webhook
        nodes.push({
          parameters: {
            method: "POST",
            url: `${config.frontendUrl.replace("5000", "5001")}${endpoint}`,
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "Authorization",
                  value: `Bearer ${config.n8nWebhookSecret}`,
                },
                {
                  name: "Content-Type",
                  value: "application/json",
                },
              ],
            },
            sendBody: true,
            specifyBody: "json",
            jsonBody: `={ "workspaceId": "${automation.workspaceId}", "automationId": "${automation.id}", "actionIndex": ${index}, "payload": {{$json}} }`,
            options: {},
          },
          id: (currentId++).toString(),
          name: actionNodeName,
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.1,
          position: [500 + index * 200, 300],
        });

        connections[previousNodeName] = {
          main: [
            [
              {
                node: actionNodeName,
                type: "main",
                index: 0,
              },
            ],
          ],
        };
        previousNodeName = actionNodeName;
      });
    }

    return {
      name: `Freelance OS Automation: ${automation.name}`,
      nodes,
      connections,
    };
  }
}
