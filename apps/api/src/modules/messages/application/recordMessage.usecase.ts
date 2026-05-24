import type { MessageDirection, MessageStatus } from "../domain/message";
import { MessageModel, ThreadModel, SessionModel } from "../infrastructure/message.model";
import { type MessageLike, toCustomerMessage } from "./message.mapper";

export type RecordMessageInput = {
  discordMessageId?: string;
  channelId: string;
  channelName?: string;
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

  // Find or create open thread for this channel
  let thread = await ThreadModel.findOne({ channelId: input.channelId, status: "open" });
  if (!thread) {
    thread = await ThreadModel.create({
      channelId: input.channelId,
      authorId: input.direction === "inbound" ? input.authorId : "unknown-customer",
      status: "open",
    });
  }
  const threadId = String(thread._id);

  // Find or create active session under this thread
  let session = await SessionModel.findOne({ threadId, status: "active" }).sort({ updatedAt: -1 });
  if (session) {
    // If session is active, check if it timed out (30 mins of inactivity)
    const timeoutMs = 30 * 60 * 1000;
    const lastActive = new Date(session.updatedAt || session.createdAt).getTime();
    if (Date.now() - lastActive > timeoutMs) {
      await SessionModel.findByIdAndUpdate(session._id, { status: "completed" });
      session = null;
    }
  }

  if (!session) {
    session = await SessionModel.create({
      threadId,
      status: "active",
    });
  } else {
    // Refresh session activity timestamp
    await SessionModel.findByIdAndUpdate(session._id, { updatedAt: new Date() });
  }
  const sessionId = String(session._id);

  const created = await MessageModel.create({
    discordMessageId: input.discordMessageId,
    channelId: input.channelId,
    channelName: input.channelName,
    authorId: input.authorId,
    authorName: input.authorName,
    content: input.content,
    direction: input.direction,
    status: input.status ?? (input.direction === "outbound" ? "sent" : "received"),
    responseToMessageId: input.responseToMessageId,
    threadId,
    sessionId,
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
