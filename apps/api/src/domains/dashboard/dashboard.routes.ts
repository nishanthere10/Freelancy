import { type Router as ExpressRouter, Router } from "express";
import { getDashboard } from "./dashboard.controller";

const router: ExpressRouter = Router({ mergeParams: true });

router.get("/", getDashboard);

export default router;
