import type { Response } from "express";
import { describe, expect, it } from "vitest";
import { handleDomainError } from "../invoice.controller";
import {
  InvoiceDraftOnlyDeleteError,
  InvoiceImmutableError,
  InvoiceInvalidStatusTransitionError,
  InvoiceNotFoundError,
  InvoicePermissionDeniedError,
} from "../invoice.errors";
import {
  createInvoiceSchema,
  invoiceItemSchema,
  recordPaymentSchema,
} from "../invoice.schema";

describe("Invoice HTTP Layer & Controller", () => {
  describe("Zod Request Validation Schemas", () => {
    it("validates line item structure", () => {
      const valid = invoiceItemSchema.safeParse({
        description: "Development Work",
        quantity: "2.00",
        unitPrice: "150.00",
      });
      expect(valid.success).toBe(true);

      const invalid = invoiceItemSchema.safeParse({
        description: "",
        quantity: "-1.00",
      });
      expect(invalid.success).toBe(false);
    });

    it("validates create invoice schema", () => {
      const valid = createInvoiceSchema.safeParse({
        clientId: "550e8400-e29b-41d4-a716-446655440000",
        taxRate: "18.00",
        items: [
          { description: "Design", quantity: "1.00", unitPrice: "500.00" },
        ],
      });
      expect(valid.success).toBe(true);

      const missingItems = createInvoiceSchema.safeParse({
        clientId: "550e8400-e29b-41d4-a716-446655440000",
        items: [],
      });
      expect(missingItems.success).toBe(false);
    });

    it("validates record payment schema", () => {
      const valid = recordPaymentSchema.safeParse({
        amountPaid: "500.00",
        paymentMethod: "upi",
      });
      expect(valid.success).toBe(true);

      const invalidAmount = recordPaymentSchema.safeParse({
        amountPaid: "0.00",
      });
      expect(invalidAmount.success).toBe(false);
    });
  });

  describe("Controller Error Handler HTTP Mapping", () => {
    function createMockResponse() {
      const res: { statusCode?: number; body?: unknown; status?: (code: number) => unknown; json?: (body: unknown) => unknown } = {};
      res.status = (code: number) => {
        res.statusCode = code;
        return res;
      };
      res.json = (body: unknown) => {
        res.body = body;
        return res;
      };
      return res as Response;
    }

    it("maps INVOICE_NOT_FOUND to 404", () => {
      const res = createMockResponse();
      handleDomainError(res, new InvoiceNotFoundError("inv-123"));
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });

    it("maps INVOICE_PERMISSION_DENIED to 403", () => {
      const res = createMockResponse();
      handleDomainError(
        res,
        new InvoicePermissionDeniedError(
          "create",
          "user-1",
          "ws-1",
          "Role required",
        ),
      );
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("maps INVOICE_IMMUTABLE to 409 Conflict", () => {
      const res = createMockResponse();
      handleDomainError(
        res,
        new InvoiceImmutableError("inv-123", "sent", "update"),
      );
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe("CONFLICT");
    });

    it("maps INVOICE_DRAFT_ONLY_DELETE to 409 Conflict", () => {
      const res = createMockResponse();
      handleDomainError(
        res,
        new InvoiceDraftOnlyDeleteError("inv-123", "paid"),
      );
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe("CONFLICT");
    });

    it("maps INVOICE_INVALID_STATUS_TRANSITION to 409 Conflict", () => {
      const res = createMockResponse();
      handleDomainError(
        res,
        new InvoiceInvalidStatusTransitionError("inv-123", "sent", "sent"),
      );
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBe("CONFLICT");
    });
  });
});
