import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";

import { asyncHandler } from "../../../shared/utils/asyncHandler";
import { AppError } from "../../../shared/errors/AppError";
import { answerCustomerMessage } from "../application/answerCustomerMessage.usecase";
import { CommandModel } from "../infrastructure/command.model";

const answerSchema = z.object({
  message: z.string().trim().min(1),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
});

export const agentRouter = Router();

agentRouter.post(
  "/answer",
  asyncHandler(async (req, res) => {
    const payload = answerSchema.parse(req.body);
    const data = await answerCustomerMessage({
      message: payload.message,
      authorId: payload.authorId,
      authorName: payload.authorName,
    });

    res.json({ data });
  })
);

// GET /api/agent/commands - Retrieve all registered agent commands
agentRouter.get(
  "/commands",
  asyncHandler(async (req, res) => {
    const commands = await CommandModel.find().sort({ name: 1 }).lean();
    res.json({ data: commands });
  })
);

// PATCH /api/agent/commands/:id - Toggle a command's enabled status
const updateCommandSchema = z.object({
  enabled: z.boolean(),
});

agentRouter.patch(
  "/commands/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid command ID format", 400);
    }

    const payload = updateCommandSchema.parse(req.body);

    const command = await CommandModel.findByIdAndUpdate(
      id,
      { enabled: payload.enabled },
      { new: true }
    ).lean();

    if (!command) {
      throw new AppError("Command not found", 404);
    }

    res.json({ data: command });
  })
);
