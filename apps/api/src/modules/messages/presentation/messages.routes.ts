import { randomUUID } from "node:crypto";

import { Router } from "express";
import { z } from "zod";

import { answerCustomerMessage } from "../../agent/application/answerCustomerMessage.usecase";
import { listRecentMessages } from "../application/listMessages.usecase";
import { recordMessage } from "../application/recordMessage.usecase";
import { ThreadModel, SessionModel, MessageModel } from "../infrastructure/message.model";
import { asyncHandler } from "../../../shared/utils/asyncHandler";
import { sendDiscordMessage } from "../../../infrastructure/discord/discordGateway";

const listMessagesSchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  channelId: z.string().optional(),
  sort: z.enum(["asc", "desc"]).default("desc").optional(),
});

const manualInboundSchema = z.object({
  channelId: z.string().default("manual-test-channel"),
  authorId: z.string().default("manual-user"),
  authorName: z.string().default("Manual Tester"),
  content: z.string().trim().min(1),
  autoReply: z.boolean().default(false),
});

const manualOutboundSchema = z.object({
  channelId: z.string().min(1),
  authorId: z.string().default("human-agent"),
  authorName: z.string().default("Human Support Agent"),
  content: z.string().trim().min(1),
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

messagesRouter.patch(
  "/threads/resolve",
  asyncHandler(async (req, res) => {
    const { channelId } = z.object({ channelId: z.string().min(1) }).parse(req.body);

    const thread = await ThreadModel.findOneAndUpdate(
      { channelId, status: "open" },
      { status: "resolved" },
      { new: true }
    ).lean();

    if (!thread) {
      res.status(404).json({
        error: {
          message: "No active open thread found for this channel.",
          statusCode: 404,
        },
      });
      return;
    }

    // Also complete any active sessions under this thread
    await SessionModel.updateMany(
      { threadId: String((thread as any)._id), status: "active" },
      { status: "completed" }
    );

    res.json({ data: thread });
  })
);

messagesRouter.get(
  "/threads",
  asyncHandler(async (req, res) => {
    const { channelId } = z.object({ channelId: z.string().min(1) }).parse(req.query);
    const threads = await ThreadModel.find({ channelId }).sort({ createdAt: 1 }).lean();
    res.json({ data: threads });
  })
);

messagesRouter.get(
  "/threads/status",
  asyncHandler(async (req, res) => {
    const { channelId } = z.object({ channelId: z.string().min(1) }).parse(req.query);

    const thread = await ThreadModel.findOne({ channelId, status: "open" }).lean();
    if (!thread) {
      res.json({ data: { status: "none", autoReply: true } });
      return;
    }

    res.json({ data: thread });
  })
);

messagesRouter.patch(
  "/threads/auto-reply",
  asyncHandler(async (req, res) => {
    const { channelId, autoReply } = z.object({
      channelId: z.string().min(1),
      autoReply: z.boolean(),
    }).parse(req.body);

    const thread = await ThreadModel.findOneAndUpdate(
      { channelId, status: "open" },
      { autoReply },
      { new: true }
    ).lean();

    if (!thread) {
      res.status(404).json({
        error: {
          message: "No active open thread found for this channel.",
          statusCode: 404,
        },
      });
      return;
    }

    res.json({ data: thread });
  })
);

messagesRouter.post(
  "/outbound",
  asyncHandler(async (req, res) => {
    const payload = manualOutboundSchema.parse(req.body);

    // Record the message as outbound (human support) in our DB
    const outbound = await recordMessage({
      channelId: payload.channelId,
      authorId: payload.authorId,
      authorName: payload.authorName,
      content: payload.content,
      direction: "outbound",
      status: "sent",
    });

    try {
      // Send message to the Discord channel
      const discordMsg = await sendDiscordMessage(payload.channelId, payload.content);

      if (discordMsg) {
        await MessageModel.findByIdAndUpdate(outbound.id, {
          discordMessageId: discordMsg.id,
        });
        outbound.discordMessageId = discordMsg.id;
      }
    } catch (error) {
      await MessageModel.findByIdAndUpdate(outbound.id, {
        status: "failed",
      });
      outbound.status = "failed";
      throw error;
    }

    res.status(201).json({ data: outbound });
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

    const thread = await ThreadModel.findOne({ channelId: payload.channelId, status: "open" });
    const isAutoReplyOff = thread?.autoReply === false;

    const suggested = !isAutoReplyOff
      ? await answerCustomerMessage({
          message: payload.content,
          authorId: payload.authorId,
          authorName: payload.authorName,
          channelId: payload.channelId,
        })
      : { answer: "AI Auto-Reply is disabled (delegated to human support) for this thread.", citations: [] };

    const outbound = (payload.autoReply && !isAutoReplyOff)
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
