import { Router } from "express";
import { meHandler } from "./users.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { asyncHandler } from "../../lib/asyncHandler.js";

const router = Router();

router.get("/me", authenticate, asyncHandler(meHandler));

export const usersRouter = router;
