import { MessageModel, SessionModel, ThreadModel } from "../models/message.model";
import { type MessageLike, toCustomerMessage } from "../mappers/message.mapper";
import { SessionStatus, ThreadStatus } from "../types/message";

export async function listRecentMessages(input?: { limit?: number; channelId?: string; sort?: "asc" | "desc" }) {
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200);
  const messageFilter = input?.channelId ? { channelId: input.channelId } : {};
  const records = await MessageModel.find(messageFilter).sort({ createdAt: -1 }).limit(limit).lean();
  const threadIds = Array.from(new Set(records.map((record) => record.threadId).filter(Boolean)));
  const sessionIds = Array.from(new Set(records.map((record) => record.sessionId).filter(Boolean)));
  const channelIds = Array.from(new Set(records.map((record) => record.channelId).filter(Boolean)));
  const [threads, openChannelThreads, sessions] = await Promise.all([
    ThreadModel.find({ _id: { $in: threadIds } }).select("_id status").lean(),
    ThreadModel.find({ channelId: { $in: channelIds }, status: ThreadStatus.Open }).select("channelId").lean(),
    SessionModel.find({ _id: { $in: sessionIds } }).select("_id status").lean(),
  ]);
  const threadStatuses = new Map(
    threads.map((thread) => [String(thread._id), thread.status as ThreadStatus])
  );
  const openChannelIds = new Set(openChannelThreads.map((thread) => thread.channelId));
  const sessionStatuses = new Map(
    sessions.map((session) => [String(session._id), session.status as SessionStatus])
  );

  const mapped = records.map((record) => {
    const threadStatus =
      (record.threadId ? threadStatuses.get(record.threadId) : undefined) ??
      (openChannelIds.has(record.channelId) ? ThreadStatus.Open : ThreadStatus.Resolved);

    return toCustomerMessage({
      ...(record as unknown as MessageLike),
      threadStatus,
      sessionStatus:
        (record.sessionId ? sessionStatuses.get(record.sessionId) : undefined) ??
        (threadStatus === ThreadStatus.Resolved ? SessionStatus.Completed : undefined),
    });
  });
  return input?.sort === "asc" ? mapped.reverse() : mapped;
}
