import { Router } from "express";

import { asyncHandler } from "../../../shared/utils/asyncHandler";
import {
  createManualInboundMessage,
  listMessages,
  resolveOpenThread,
} from "../controllers/messages.controller";

export const messagesRouter = Router();

messagesRouter.get("/", asyncHandler(listMessages));
messagesRouter.patch("/threads/resolve", asyncHandler(resolveOpenThread));
messagesRouter.post("/inbound", asyncHandler(createManualInboundMessage));
