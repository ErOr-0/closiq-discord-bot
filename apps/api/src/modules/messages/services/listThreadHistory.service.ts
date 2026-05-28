import { MessageModel, ThreadModel } from "../models/message.model";

export type ThreadHistoryMessage = {
  content: string;
  direction: "inbound" | "outbound";
};

export async function listThreadHistory(input: {
  channelId: string;
  limit?: number;
}): Promise<ThreadHistoryMessage[]> {
  const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
  const activeThread = await ThreadModel.findOne({ channelId: input.channelId, status: "open" });

  if (!activeThread) {
    return [];
  }

  const threadMessages = await MessageModel.find({ threadId: String(activeThread._id) })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  return threadMessages.map((message) => ({
    content: message.content,
    direction: message.direction as "inbound" | "outbound",
  }));
}
