import { randomUUID } from "node:crypto";

import { Router } from "express";
import { z } from "zod";

import { answerCustomerMessage } from "../../agent/application/answerCustomerMessage.usecase";
import { listRecentMessages } from "../application/listMessages.usecase";
import { recordMessage } from "../application/recordMessage.usecase";
import { asyncHandler } from "../../../shared/utils/asyncHandler";

const listMessagesSchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  channelId: z.string().optional(),
});

const manualInboundSchema = z.object({
  channelId: z.string().default("manual-test-channel"),
  authorId: z.string().default("manual-user"),
  authorName: z.string().default("Manual Tester"),
  content: z.string().trim().min(1),
  autoReply: z.boolean().default(false),
});

export const messagesRouter = Router();

messagesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listMessagesSchema.parse(req.query);
    const data = await listRecentMessages(query);

    res.json({ data });
  })
);

messagesRouter.post(
  "/inbound",
  asyncHandler(async (req, res) => {
    const payload = manualInboundSchema.parse(req.body);
    const inbound = await recordMessage({
      discordMessageId: `manual-${randomUUID()}`,
      channelId: payload.channelId,
      authorId: payload.authorId,
      authorName: payload.authorName,
      content: payload.content,
      direction: "inbound",
      status: "received",
    });

    const suggested = await answerCustomerMessage({ message: payload.content });
    const outbound = payload.autoReply
      ? await recordMessage({
          discordMessageId: `manual-${randomUUID()}`,
          channelId: payload.channelId,
          authorId: "closiq-agent",
          authorName: "Closiq AI Agent",
          content: suggested.answer,
          direction: "outbound",
          status: "sent",
          responseToMessageId: inbound.id,
          aiGenerated: true,
        })
      : null;

    res.status(201).json({
      data: {
        inbound,
        outbound,
        suggestedAnswer: suggested.answer,
        citations: suggested.citations,
      },
    });
  })
);
