import type { MessageDirection, MessageStatus } from "../domain/message";
import { MessageModel } from "../infrastructure/message.model";
import { type MessageLike, toCustomerMessage } from "./message.mapper";

export type RecordMessageInput = {
  discordMessageId?: string;
  channelId: string;
  authorId: string;
  authorName: string;
  content: string;
  direction: MessageDirection;
  status?: MessageStatus;
  responseToMessageId?: string;
  aiGenerated?: boolean;
};

export async function recordMessage(input: RecordMessageInput) {
  if (input.discordMessageId) {
    const existing = await MessageModel.findOne({ discordMessageId: input.discordMessageId }).lean();

    if (existing) {
      return toCustomerMessage(existing as unknown as MessageLike);
    }
  }

  const created = await MessageModel.create({
    discordMessageId: input.discordMessageId,
    channelId: input.channelId,
    authorId: input.authorId,
    authorName: input.authorName,
    content: input.content,
    direction: input.direction,
    status: input.status ?? (input.direction === "outbound" ? "sent" : "received"),
    responseToMessageId: input.responseToMessageId,
    aiGenerated: input.aiGenerated ?? false,
  });

  return toCustomerMessage(created.toObject());
}

export async function markMessageAnswered(messageId: string) {
  const updated = await MessageModel.findByIdAndUpdate(
    messageId,
    { status: "answered" },
    { new: true }
  ).lean();

  return updated ? toCustomerMessage(updated as unknown as MessageLike) : null;
}
