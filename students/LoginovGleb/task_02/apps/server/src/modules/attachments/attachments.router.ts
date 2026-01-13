import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import {
  createAttachmentHandler,
  deleteAttachmentHandler,
  getAttachmentHandler,
  listAttachmentsHandler
} from "./attachments.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(listAttachmentsHandler));
router.get("/:id", asyncHandler(getAttachmentHandler));
router.post("/", asyncHandler(createAttachmentHandler));
router.delete("/:id", asyncHandler(deleteAttachmentHandler));

export const attachmentsRouter = router;
