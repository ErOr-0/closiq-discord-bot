import { SessionModel, ThreadModel } from "../models/message.model";
import { SessionStatus, ThreadStatus } from "../types/message";

export type ResolveThreadInput = {
  channelId?: string;
  threadIds?: string[];
};

export async function resolveThread(input: ResolveThreadInput) {
  const uniqueThreadIds = Array.from(new Set(input.threadIds ?? [])).filter(Boolean);
  const threadLookupConditions = [
    ...(uniqueThreadIds.length > 0 ? [{ _id: { $in: uniqueThreadIds } }] : []),
    ...(input.channelId ? [{ channelId: input.channelId }] : []),
  ];

  if (threadLookupConditions.length === 0) {
    return {
      channelId: input.channelId,
      channelIds: [],
      threadStatus: ThreadStatus.Resolved,
      resolvedThreadCount: 0,
      completedSessionCount: 0,
      alreadyResolved: true,
    };
  }

  const openThreads = await ThreadModel.find({
    $or: threadLookupConditions,
    status: ThreadStatus.Open,
  })
    .select("_id channelId")
    .lean();
  const channelIds = Array.from(
    new Set([
      ...openThreads.map((thread) => thread.channelId),
      ...(input.channelId ? [input.channelId] : []),
    ])
  );

  if (openThreads.length === 0) {
    return {
      channelId: input.channelId,
      channelIds,
      threadStatus: ThreadStatus.Resolved,
      resolvedThreadCount: 0,
      completedSessionCount: 0,
      alreadyResolved: true,
    };
  }

  const threadIds = openThreads.map((thread) => String(thread._id));

  const [threadUpdate, sessionUpdate] = await Promise.all([
    ThreadModel.updateMany(
      { _id: { $in: threadIds }, status: ThreadStatus.Open },
      { status: ThreadStatus.Resolved }
    ),
    SessionModel.updateMany(
      { threadId: { $in: threadIds }, status: SessionStatus.Active },
      { status: SessionStatus.Completed }
    ),
  ]);

  return {
    channelId: input.channelId,
    channelIds,
    threadStatus: ThreadStatus.Resolved,
    resolvedThreadCount: threadUpdate.modifiedCount,
    completedSessionCount: sessionUpdate.modifiedCount,
    alreadyResolved: false,
  };
}
