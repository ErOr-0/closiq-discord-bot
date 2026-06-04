import { randomUUID } from "node:crypto";

import type { Request, Response } from "express";
import { z } from "zod";

import { sendDiscordChannelMessage } from "../../../integrations/discord/discordGateway";
import { answerCustomerMessage } from "../../agent/services/answerCustomerMessage.service";
import { requestHumanTakeover } from "../services/humanTakeover.service";
import { listRecentMessages } from "../services/listMessages.service";
import { recordMessage } from "../services/recordMessage.service";
import { resolveThread } from "../services/resolveThread.service";

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

const resolveThreadSchema = z.object({
  channelId: z.string().min(1).optional(),
  threadIds: z.array(z.string().min(1)).optional(),
}).refine((payload) => payload.channelId || (payload.threadIds && payload.threadIds.length > 0), {
  message: "channelId or threadIds is required",
});

const humanTakeoverSchema = z.object({
  channelId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
});

const manualOutboundSchema = z.object({
  channelId: z.string().min(1),
  channelName: z.string().optional(),
  authorId: z.string().default("human-agent"),
  authorName: z.string().default("Support Agent"),
  content: z.string().trim().min(1).max(1900),
  responseToMessageId: z.string().optional(),
  deliverToDiscord: z.boolean().default(true),
});

export async function listMessages(req: Request, res: Response) {
  const query = listMessagesSchema.parse(req.query);
  const data = await listRecentMessages(query);

  res.json({ data });
}

export async function resolveOpenThread(req: Request, res: Response) {
  const payload = resolveThreadSchema.parse(req.body);
  const data = await resolveThread(payload);

  res.json({ data });
}

export async function requestThreadHumanTakeover(req: Request, res: Response) {
  const payload = humanTakeoverSchema.parse(req.body);
  const data = await requestHumanTakeover({
    channelId: payload.channelId,
    reason: payload.reason,
    requestedBy: "human",
  });

  res.json({ data });
}

export async function createManualOutboundMessage(req: Request, res: Response) {
  const payload = manualOutboundSchema.parse(req.body);
  let discordMessageId: string | undefined;
  let authorId = payload.authorId;
  let authorName = payload.authorName;

  if (payload.deliverToDiscord) {
    try {
      const discordMessage = await sendDiscordChannelMessage({
        channelId: payload.channelId,
        content: payload.content,
      });
      discordMessageId = discordMessage.id;
      authorId = discordMessage.author.id;
      authorName = payload.authorName;
    } catch (error) {
      if (!payload.channelId.startsWith("manual-")) {
        throw error;
      }
    }
  }

  const outbound = await recordMessage({
    discordMessageId: discordMessageId ?? `manual-${randomUUID()}`,
    channelId: payload.channelId,
    channelName: payload.channelName,
    authorId,
    authorName,
    content: payload.content,
    direction: "outbound",
    status: "sent",
    responseToMessageId: payload.responseToMessageId,
    aiGenerated: false,
  });

  res.status(201).json({ data: outbound });
}

export async function createManualInboundMessage(req: Request, res: Response) {
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

  const suggested = await answerCustomerMessage({
    message: payload.content,
    authorId: payload.authorId,
    authorName: payload.authorName,
    channelId: payload.channelId,
  });

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
}
