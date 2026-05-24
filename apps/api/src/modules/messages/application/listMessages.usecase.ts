import { MessageModel } from "../infrastructure/message.model";
import { type MessageLike, toCustomerMessage } from "./message.mapper";

export async function listRecentMessages(input?: { limit?: number; channelId?: string; sort?: "asc" | "desc" }) {
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200);
  const filter = input?.channelId ? { channelId: input.channelId } : {};
  const records = await MessageModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

  const mapped = records.map((record) => toCustomerMessage(record as unknown as MessageLike));
  return input?.sort === "asc" ? mapped.reverse() : mapped;
}
