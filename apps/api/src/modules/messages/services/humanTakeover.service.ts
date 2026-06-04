import { ThreadModel } from "../models/message.model";
import { ThreadStatus } from "../types/message";

export type RequestHumanTakeoverInput = {
  channelId: string;
  reason?: string;
  requestedBy?: "agent" | "human" | "system";
};

export type RequestHumanTakeoverResult = {
  channelId: string;
  threadStatus: ThreadStatus.HumanTakeover;
  alreadyInHumanTakeover: boolean;
  threadId: string;
};

export async function requestHumanTakeover(
  input: RequestHumanTakeoverInput
): Promise<RequestHumanTakeoverResult> {
  const existing = await ThreadModel.findOne({
    channelId: input.channelId,
    status: { $in: [ThreadStatus.Open, ThreadStatus.HumanTakeover] },
  });

  const takeoverFields = {
    status: ThreadStatus.HumanTakeover,
    humanTakeoverReason: input.reason,
    humanTakeoverRequestedBy: input.requestedBy ?? "human",
    humanTakeoverAt: new Date(),
  };

  if (existing) {
    const alreadyInHumanTakeover = existing.status === ThreadStatus.HumanTakeover;
    const updated = await ThreadModel.findByIdAndUpdate(existing._id, takeoverFields, {
      new: true,
    });

    return {
      channelId: input.channelId,
      threadStatus: ThreadStatus.HumanTakeover,
      alreadyInHumanTakeover,
      threadId: String(updated?._id ?? existing._id),
    };
  }

  const created = await ThreadModel.create({
    channelId: input.channelId,
    authorId: "unknown-customer",
    ...takeoverFields,
  });

  return {
    channelId: input.channelId,
    threadStatus: ThreadStatus.HumanTakeover,
    alreadyInHumanTakeover: false,
    threadId: String(created._id),
  };
}

export async function isHumanTakeoverActive(channelId: string) {
  const thread = await ThreadModel.findOne({
    channelId,
    status: ThreadStatus.HumanTakeover,
  })
    .select("_id")
    .lean();

  return Boolean(thread);
}
