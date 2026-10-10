/**
 * Centralized Application Configuration
 * Abstraction layer for environment configuration across Node.js and Cloudflare Workers runtimes.
 */

export const config = {
  get env() {
    return process.env.NODE_ENV || "development";
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get isTest() {
    return process.env.NODE_ENV === "test";
  },
  get port() {
    return Number.parseInt(process.env.PORT || "5001", 10);
  },
  get frontendUrl() {
    return process.env.FRONTEND_URL || "http://localhost:5000";
  },
  get databaseUrl() {
    return process.env.DATABASE_URL;
  },
  get clerkPublishableKey() {
    return (
      process.env.CLERK_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    );
  },
  get clerkSecretKey() {
    return process.env.CLERK_SECRET_KEY;
  },
  get enableMockAuth() {
    return process.env.ENABLE_MOCK_AUTH === "true";
  },
  get debugDb() {
    return process.env.DEBUG_DB === "true";
  },
  get aiServiceUrl() {
    return process.env.AI_SERVICE_URL || "http://localhost:8000";
  },
  get aiServiceApiKey() {
    return process.env.AI_SERVICE_API_KEY || "";
  },
  get n8nBaseUrl() {
    return process.env.N8N_BASE_URL || "http://localhost:5678";
  },
  get n8nApiKey() {
    return process.env.N8N_API_KEY || "";
  },
  get n8nWebhookSecret() {
    return (
      process.env.AUTOMATION_SERVICE_TOKEN ||
      process.env.N8N_WEBHOOK_SECRET ||
      (this.isProduction ? "" : "dev_unsafe_secret")
    );
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY || "";
  },
  get resendWebhookSecret() {
    return process.env.RESEND_WEBHOOK_SECRET || "";
  },
  get waGatewayUrl() {
    return (
      process.env.WA_GATEWAY_URL ||
      process.env.WA_AKG_GATEWAY_URL ||
      "http://localhost:3001"
    );
  },
  get waGatewayApiKey() {
    return (
      process.env.WA_GATEWAY_API_KEY ||
      process.env.WA_AKG_API_KEY ||
      ""
    );
  },
  get waGatewayWebhookSecret() {
    return (
      process.env.WA_GATEWAY_WEBHOOK_SECRET ||
      process.env.WA_AKG_WEBHOOK_SECRET ||
      ""
    );
  },
};
