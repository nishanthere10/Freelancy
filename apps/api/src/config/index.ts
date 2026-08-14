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
};
