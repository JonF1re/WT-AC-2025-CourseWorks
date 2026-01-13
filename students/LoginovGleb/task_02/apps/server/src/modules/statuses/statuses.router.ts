import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { authorizeRoles } from "../../middleware/authorize.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import {
  createStatusHandler,
  deleteStatusHandler,
  getStatusHandler,
  listStatusesHandler,
  updateStatusHandler
} from "./statuses.controller.js";

const router = Router();

router.get("/", authenticate, asyncHandler(listStatusesHandler));
router.get("/:id", authenticate, asyncHandler(getStatusHandler));
router.post("/", authenticate, authorizeRoles("admin"), asyncHandler(createStatusHandler));
router.put("/:id", authenticate, authorizeRoles("admin"), asyncHandler(updateStatusHandler));
router.delete("/:id", authenticate, authorizeRoles("admin"), asyncHandler(deleteStatusHandler));

export const statusesRouter = router;
