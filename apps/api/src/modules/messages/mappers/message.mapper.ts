import type { CustomerMessage, MessageDirection, MessageStatus } from "../types/message";

export type MessageLike = {
  _id: unknown;
  discordMessageId?: string | null;
  channelId: string;
  channelName?: string | null;
  authorId: string;
  authorName: string;
  content: string;
  direction: MessageDirection;
  status: MessageStatus;
  responseToMessageId?: string | null;
  aiGenerated?: boolean;
  threadId?: string | null;
  sessionId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export function toCustomerMessage(record: MessageLike): CustomerMessage {
  return {
    id: String(record._id),
    discordMessageId: record.discordMessageId ?? undefined,
    channelId: record.channelId,
    channelName: record.channelName ?? undefined,
    authorId: record.authorId,
    authorName: record.authorName,
    content: record.content,
    direction: record.direction,
    status: record.status,
    responseToMessageId: record.responseToMessageId ?? undefined,
    aiGenerated: Boolean(record.aiGenerated),
    threadId: record.threadId ?? undefined,
    sessionId: record.sessionId ?? undefined,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toIsoString(value?: Date | string) {
  if (!value) {
    return new Date().toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
