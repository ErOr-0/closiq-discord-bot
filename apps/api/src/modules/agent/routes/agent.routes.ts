import { Router } from "express";

import { asyncHandler } from "../../../shared/utils/asyncHandler";
import { answer, listCommands, updateCommand } from "../controllers/agent.controller";

export const agentRouter = Router();

agentRouter.post("/answer", asyncHandler(answer));
agentRouter.get("/commands", asyncHandler(listCommands));
agentRouter.patch("/commands/:id", asyncHandler(updateCommand));
