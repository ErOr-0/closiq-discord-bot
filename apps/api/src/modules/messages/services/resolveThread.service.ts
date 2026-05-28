import { SessionModel, ThreadModel } from "../models/message.model";

export async function resolveThread(input: { channelId: string }) {
  const thread = await ThreadModel.findOneAndUpdate(
    { channelId: input.channelId, status: "open" },
    { status: "resolved" },
    { new: true }
  ).lean();

  if (!thread) {
    return null;
  }

  const threadId = String((thread as { _id: unknown })._id);

  await SessionModel.updateMany(
    { threadId, status: "active" },
    { status: "completed" }
  );

  return thread;
}
