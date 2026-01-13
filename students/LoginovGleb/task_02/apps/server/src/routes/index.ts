import { Router } from "express";
import { authRouter } from "../modules/auth/auth.router.js";
import { usersRouter } from "../modules/users/users.router.js";
import { healthRouter } from "./health.js";
import { formsRouter } from "../modules/forms/forms.router.js";
import { statusesRouter } from "../modules/statuses/statuses.router.js";
import { applicationsRouter } from "../modules/applications/applications.router.js";
import { attachmentsRouter } from "../modules/attachments/attachments.router.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/forms", formsRouter);
router.use("/statuses", statusesRouter);
router.use("/applications", applicationsRouter);
router.use("/attachments", attachmentsRouter);
router.use(healthRouter);

export const apiRouter = router;
