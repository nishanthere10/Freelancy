import { describe, expect, it } from "vitest";
import { activityQuerySchema } from "../../domains/activity/activity.schema";
import {
  clientParamsSchema,
  createClientSchema,
} from "../../domains/client/client.schema";
import {
  createInvoiceSchema,
  recordPaymentSchema,
} from "../../domains/invoice/invoice.schema";
import {
  changeProjectStatusSchema,
  createProjectSchema,
} from "../../domains/project/project.schema";

describe("Security: Input Hardening & Parameter Boundary Validation", () => {
  describe("UUID Hardening", () => {
    it("rejects SQL injection payloads in UUID parameters", () => {
      const sqlPayloads = [
        "1' OR '1'='1",
        "'; DROP TABLE users; --",
        "550e8400-e29b-41d4-a716-446655440000'--",
        "UNION SELECT * FROM users",
        "not-a-valid-uuid",
        "",
      ];

      for (const payload of sqlPayloads) {
        const result = clientParamsSchema.safeParse({
          workspaceId: payload,
          clientId: payload,
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe("String & URL Hardening", () => {
    it("rejects malicious javascript: and data: URL schemes in client website", () => {
      const maliciousUrls = [
        "javascript:alert(document.cookie)",
        "javascript:eval(atob('...'))",
        "data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        "htt://invalid-protocol.com",
      ];

      for (const url of maliciousUrls) {
        const result = createClientSchema.safeParse({
          name: "Test Client",
          email: "test@example.com",
          website: url,
        });
        expect(result.success).toBe(false);
      }
    });

    it("allows valid https:// and http:// website URLs", () => {
      const validUrls = [
        "https://example.com",
        "http://client.co.uk/about",
        "https://sub.domain.org/path?q=1",
      ];

      for (const url of validUrls) {
        const result = createClientSchema.safeParse({
          name: "Test Client",
          email: "test@example.com",
          website: url,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects strings exceeding maximum schema lengths", () => {
      const oversizedName = "A".repeat(256);
      const res = createClientSchema.safeParse({
        name: oversizedName,
        email: "test@example.com",
      });
      expect(res.success).toBe(false);
    });

    it("safely trims and preserves script tags as literal data without execution", () => {
      const scriptPayload = "<script>alert('XSS')</script>";
      const result = createClientSchema.safeParse({
        name: scriptPayload,
        email: "xss@test.com",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(scriptPayload);
      }
    });
  });

  describe("Pagination Abuse Hardening", () => {
    it("rejects non-positive pagination limit: limit=0", () => {
      const res = activityQuerySchema.safeParse({ limit: "0" });
      expect(res.success).toBe(false);
    });

    it("rejects negative pagination limit: limit=-25", () => {
      const res = activityQuerySchema.safeParse({ limit: "-25" });
      expect(res.success).toBe(false);
    });

    it("rejects unbounded pagination limit: limit=999999 (capped at max 100)", () => {
      const res = activityQuerySchema.safeParse({ limit: "999999" });
      expect(res.success).toBe(false);
    });

    it("accepts valid bounded pagination limits (1 to 100)", () => {
      expect(activityQuerySchema.safeParse({ limit: "1" }).success).toBe(true);
      expect(activityQuerySchema.safeParse({ limit: "50" }).success).toBe(true);
      expect(activityQuerySchema.safeParse({ limit: "100" }).success).toBe(
        true,
      );
    });
  });

  describe("Invoice Financial Input Hardening", () => {
    it("rejects invoice with empty line items array", () => {
      const res = createInvoiceSchema.safeParse({
        clientId: "550e8400-e29b-41d4-a716-446655440000",
        items: [],
      });
      expect(res.success).toBe(false);
    });

    it("rejects negative taxRate", () => {
      const res = createInvoiceSchema.safeParse({
        clientId: "550e8400-e29b-41d4-a716-446655440000",
        taxRate: "-5.00",
        items: [{ description: "Item", quantity: "1.00", unitPrice: "100.00" }],
      });
      expect(res.success).toBe(false);
    });

    it("rejects taxRate exceeding 100%", () => {
      const res = createInvoiceSchema.safeParse({
        clientId: "550e8400-e29b-41d4-a716-446655440000",
        taxRate: "150.00",
        items: [{ description: "Item", quantity: "1.00", unitPrice: "100.00" }],
      });
      expect(res.success).toBe(false);
    });

    it("rejects negative discountRate", () => {
      const res = createInvoiceSchema.safeParse({
        clientId: "550e8400-e29b-41d4-a716-446655440000",
        discountRate: "-10.00",
        items: [{ description: "Item", quantity: "1.00", unitPrice: "100.00" }],
      });
      expect(res.success).toBe(false);
    });

    it("rejects discountRate exceeding 100%", () => {
      const res = createInvoiceSchema.safeParse({
        clientId: "550e8400-e29b-41d4-a716-446655440000",
        discountRate: "101.00",
        items: [{ description: "Item", quantity: "1.00", unitPrice: "100.00" }],
      });
      expect(res.success).toBe(false);
    });

    it("rejects negative payment amounts", () => {
      const res = recordPaymentSchema.safeParse({
        amountPaid: "-500.00",
      });
      expect(res.success).toBe(false);
    });

    it("rejects zero payment amount", () => {
      const res = recordPaymentSchema.safeParse({
        amountPaid: "0.00",
      });
      expect(res.success).toBe(false);
    });

    it("rejects excessive decimal precision beyond 2 decimal places", () => {
      const res = recordPaymentSchema.safeParse({
        amountPaid: "100.555",
      });
      expect(res.success).toBe(false);
    });

    it("accepts valid decimal payment amounts", () => {
      expect(recordPaymentSchema.safeParse({ amountPaid: "100" }).success).toBe(
        true,
      );
      expect(
        recordPaymentSchema.safeParse({ amountPaid: "100.5" }).success,
      ).toBe(true);
      expect(
        recordPaymentSchema.safeParse({ amountPaid: "100.55" }).success,
      ).toBe(true);
    });
  });

  describe("Project Input Hardening", () => {
    it("rejects invalid project status enums", () => {
      const res = changeProjectStatusSchema.safeParse({
        status: "super_admin_status",
      });
      expect(res.success).toBe(false);
    });

    it("accepts valid project status enums", () => {
      const validStatuses = ["draft", "active", "completed", "archived"];
      for (const status of validStatuses) {
        expect(changeProjectStatusSchema.safeParse({ status }).success).toBe(
          true,
        );
      }
    });
  });
});
