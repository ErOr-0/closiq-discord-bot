import { Router } from "express";

import { asyncHandler } from "../../../shared/utils/asyncHandler";
import {
  createManualOutboundMessage,
  createManualInboundMessage,
  listMessages,
  requestThreadHumanTakeover,
  resolveOpenThread,
} from "../controllers/messages.controller";

export const messagesRouter = Router();

messagesRouter.get("/", asyncHandler(listMessages));
messagesRouter.patch("/threads/resolve", asyncHandler(resolveOpenThread));
messagesRouter.patch("/threads/takeover", asyncHandler(requestThreadHumanTakeover));
messagesRouter.post("/inbound", asyncHandler(createManualInboundMessage));
messagesRouter.post("/outbound", asyncHandler(createManualOutboundMessage));
