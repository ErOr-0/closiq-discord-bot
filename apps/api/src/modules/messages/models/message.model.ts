import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";

import {
  messageDirections,
  messageStatuses,
  SessionStatus,
  sessionStatuses,
  ThreadStatus,
  threadStatuses,
} from "../types/message";

const messageSchema = new Schema(
  {
    discordMessageId: {
      type: String,
      index: true,
      sparse: true,
      unique: true,
    },
    channelId: {
      type: String,
      required: true,
      index: true,
    },
    channelName: {
      type: String,
    },
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    direction: {
      type: String,
      enum: messageDirections,
      required: true,
    },
    status: {
      type: String,
      enum: messageStatuses,
      default: "received",
      required: true,
    },
    responseToMessageId: {
      type: String,
    },
    threadId: {
      type: String,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ createdAt: -1 });
messageSchema.index({ channelId: 1, createdAt: -1 });
messageSchema.index({ threadId: 1, createdAt: -1 });

export type MessageRecord = InferSchemaType<typeof messageSchema>;
export type MessageDocument = HydratedDocument<MessageRecord>;

export const MessageModel =
  models.Message || model<MessageRecord>("Message", messageSchema);

// Thread Schema and Model
const threadSchema = new Schema(
  {
    channelId: {
      type: String,
      required: true,
      index: true,
    },
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: threadStatuses,
      default: ThreadStatus.Open,
      required: true,
    },
    humanTakeoverReason: {
      type: String,
    },
    humanTakeoverRequestedBy: {
      type: String,
    },
    humanTakeoverAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

threadSchema.index({ channelId: 1, status: 1 });

export type ThreadRecord = InferSchemaType<typeof threadSchema>;
export type ThreadDocument = HydratedDocument<ThreadRecord>;

export const ThreadModel =
  models.Thread || model<ThreadRecord>("Thread", threadSchema);

// Session Schema and Model
const sessionSchema = new Schema(
  {
    threadId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: sessionStatuses,
      default: SessionStatus.Active,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ threadId: 1, status: 1 });

export type SessionRecord = InferSchemaType<typeof sessionSchema>;
export type SessionDocument = HydratedDocument<SessionRecord>;

export const SessionModel =
  models.Session || model<SessionRecord>("Session", sessionSchema);
