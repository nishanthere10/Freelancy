import { type Router as ExpressRouter, Router } from "express";
import { z } from "zod";
import {
  cancelInvoice,
  createInvoice,
  deleteInvoice,
  getInvoice,
  listInvoices,
  recordPayment,
  sendInvoice,
  updateInvoice,
} from "./invoice.controller";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "./invoice.middleware";
import {
  createInvoiceSchema,
  invoiceQuerySchema,
  recordPaymentSchema,
  sendInvoiceSchema,
  updateInvoiceSchema,
} from "./invoice.schema";

export const invoiceWorkspaceParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

export const invoiceIdParamsSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  id: z.string().uuid("Invalid invoice ID"),
});

const router: ExpressRouter = Router({ mergeParams: true });

router.get(
  "/",
  validateParams(invoiceWorkspaceParamsSchema),
  validateQuery(invoiceQuerySchema),
  listInvoices,
);
router.post(
  "/",
  validateParams(invoiceWorkspaceParamsSchema),
  validateBody(createInvoiceSchema),
  createInvoice,
);
router.get("/:id", validateParams(invoiceIdParamsSchema), getInvoice);
router.patch(
  "/:id",
  validateParams(invoiceIdParamsSchema),
  validateBody(updateInvoiceSchema),
  updateInvoice,
);
router.post(
  "/:id/send",
  validateParams(invoiceIdParamsSchema),
  validateBody(sendInvoiceSchema),
  sendInvoice,
);
router.post(
  "/:id/pay",
  validateParams(invoiceIdParamsSchema),
  validateBody(recordPaymentSchema),
  recordPayment,
);
router.post(
  "/:id/cancel",
  validateParams(invoiceIdParamsSchema),
  cancelInvoice,
);
router.delete("/:id", validateParams(invoiceIdParamsSchema), deleteInvoice);

export default router;
