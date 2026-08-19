import { describe, expect, it } from "vitest";
import { activityQuerySchema } from "../activity.schema";

describe("Activity HTTP Schemas & Query Validation", () => {
  it("parses valid query parameters with default limit", () => {
    const result = activityQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
      expect(result.data.cursor).toBeUndefined();
    }
  });

  it("parses valid entityType and UUID entityId", () => {
    const validUuid = "11111111-1111-1111-1111-111111111111";
    const result = activityQuerySchema.safeParse({
      limit: "50",
      entityType: "client",
      entityId: validUuid,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.entityType).toBe("client");
      expect(result.data.entityId).toBe(validUuid);
    }
  });

  it("rejects invalid entityType", () => {
    const result = activityQuerySchema.safeParse({
      entityType: "invalid_entity",
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID in entityId", () => {
    const result = activityQuerySchema.safeParse({
      entityId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.entityId).toBeDefined();
    }
  });

  it("caps limit within range 1 to 100", () => {
    const minRes = activityQuerySchema.safeParse({ limit: "0" });
    expect(minRes.success).toBe(false);

    const maxRes = activityQuerySchema.safeParse({ limit: "150" });
    expect(maxRes.success).toBe(false);
  });
});
