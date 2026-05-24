import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../../../shared/utils/asyncHandler";
import { answerCustomerMessage } from "../application/answerCustomerMessage.usecase";

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
