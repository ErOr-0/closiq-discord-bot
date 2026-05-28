import { Schema, model, models, type HydratedDocument, type InferSchemaType } from "mongoose";

const knowledgeStorageSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ["minio"],
      required: true,
    },
    bucket: {
      type: String,
      required: true,
      trim: true,
    },
    objectKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    folder: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    contentType: {
      type: String,
      trim: true,
    },
    size: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

const knowledgeSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    source: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    qdrantPointId: {
      type: String,
      index: true,
    },
    storage: knowledgeStorageSchema,
  },
  {
    timestamps: true,
  }
);

knowledgeSchema.index({ title: "text", content: "text", tags: "text" });
knowledgeSchema.index({ createdAt: -1 });

export type KnowledgeRecord = InferSchemaType<typeof knowledgeSchema>;
export type KnowledgeDocumentRecord = HydratedDocument<KnowledgeRecord>;

export const KnowledgeModel =
  models.KnowledgeDocument || model<KnowledgeRecord>("KnowledgeDocument", knowledgeSchema);
