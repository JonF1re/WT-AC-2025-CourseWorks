import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import {
  createFormHandler,
  deleteFormHandler,
  getFormHandler,
  listFormsHandler,
  updateFormHandler
} from "./forms.controller.js";
import { authenticate, authenticateOptional } from "../../middleware/auth.js";
import { authorizeRoles } from "../../middleware/authorize.js";

const router = Router();

router.get("/", authenticateOptional, asyncHandler(listFormsHandler));
router.get("/:id", authenticateOptional, asyncHandler(getFormHandler));
router.post("/", authenticate, authorizeRoles("admin"), asyncHandler(createFormHandler));
router.put("/:id", authenticate, authorizeRoles("admin"), asyncHandler(updateFormHandler));
router.delete("/:id", authenticate, authorizeRoles("admin"), asyncHandler(deleteFormHandler));

export const formsRouter = router;
