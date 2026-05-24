import type { CustomerMessage, MessageDirection, MessageStatus } from "../domain/message";

export type MessageLike = {
  _id: unknown;
  discordMessageId?: string | null;
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  direction: MessageDirection;
  status: MessageStatus;
  responseToMessageId?: string | null;
  aiGenerated?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export function toCustomerMessage(record: MessageLike): CustomerMessage {
  return {
    id: String(record._id),
    discordMessageId: record.discordMessageId ?? undefined,
    channelId: record.channelId,
    authorId: record.authorId,
    authorName: record.authorName,
    content: record.content,
    direction: record.direction,
    status: record.status,
    responseToMessageId: record.responseToMessageId ?? undefined,
    aiGenerated: Boolean(record.aiGenerated),
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
