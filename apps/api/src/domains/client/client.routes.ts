import { type Router as ExpressRouter, Router } from "express";
import {
  createClient,
  deleteClient,
  getClient,
  listClients,
  restoreClient,
  updateClient,
} from "./client.controller";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "./client.middleware";
import {
  clientParamsSchema,
  createClientSchema,
  listClientsQuerySchema,
  updateClientSchema,
} from "./client.schema";

const router: ExpressRouter = Router({ mergeParams: true });

router.get(
  "/",
  validateParams(clientParamsSchema),
  validateQuery(listClientsQuerySchema),
  listClients,
);
router.post(
  "/",
  validateParams(clientParamsSchema),
  validateBody(createClientSchema),
  createClient,
);
router.get("/:clientId", validateParams(clientParamsSchema), getClient);
router.patch(
  "/:clientId",
  validateParams(clientParamsSchema),
  validateBody(updateClientSchema),
  updateClient,
);
router.delete("/:clientId", validateParams(clientParamsSchema), deleteClient);
router.post(
  "/:clientId/restore",
  validateParams(clientParamsSchema),
  restoreClient,
);

export default router;
