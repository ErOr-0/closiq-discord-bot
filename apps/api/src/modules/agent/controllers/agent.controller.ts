import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { AppError } from "../../../shared/errors/AppError";
import { answerCustomerMessage } from "../services/answerCustomerMessage.service";
import { CommandModel } from "../models/command.model";

const answerSchema = z.object({
  message: z.string().trim().min(1),
  authorId: z.string().optional(),
  authorName: z.string().optional(),
});

const updateCommandSchema = z.object({
  enabled: z.boolean(),
});

export async function answer(req: Request, res: Response) {
  const payload = answerSchema.parse(req.body);
  const data = await answerCustomerMessage({
    message: payload.message,
    authorId: payload.authorId,
    authorName: payload.authorName,
  });

  res.json({ data });
}

export async function listCommands(_req: Request, res: Response) {
  const commands = await CommandModel.find().sort({ name: 1 }).lean();
  res.json({ data: commands });
}

export async function updateCommand(req: Request, res: Response) {
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
}
