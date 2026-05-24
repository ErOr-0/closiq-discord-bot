import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";

import { messageDirections, messageStatuses } from "../domain/message";

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

export type MessageRecord = InferSchemaType<typeof messageSchema>;
export type MessageDocument = HydratedDocument<MessageRecord>;

export const MessageModel =
  models.Message || model<MessageRecord>("Message", messageSchema);
