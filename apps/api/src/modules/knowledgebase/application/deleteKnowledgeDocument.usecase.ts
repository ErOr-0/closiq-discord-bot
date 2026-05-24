import { isValidObjectId } from "mongoose";

import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { deleteKnowledgeObjects } from "../../../infrastructure/storage/minio";
import { qdrantClient } from "../../../infrastructure/vector/qdrant";
import { AppError } from "../../../shared/errors/AppError";
import { KnowledgeModel } from "../infrastructure/knowledge.model";
import type { KnowledgeLike } from "./knowledge.mapper";

export async function deleteKnowledgeDocument(input: { id: string }) {
  if (!isValidObjectId(input.id)) {
    throw new AppError("Knowledge document not found", 404);
  }

  const document = await KnowledgeModel.findById(input.id);

  if (!document) {
    throw new AppError("Knowledge document not found", 404);
  }

  const record = document.toObject() as unknown as KnowledgeLike;
  const storageObjectKey = record.storage?.objectKey;

  await deleteKnowledgeObjects([storageObjectKey]);

  if (record.qdrantPointId) {
    await qdrantClient.delete(env.QDRANT_COLLECTION, {
      wait: true,
      points: [record.qdrantPointId],
    });

    logger.info("Knowledge vector deleted from Qdrant", {
      collection: env.QDRANT_COLLECTION,
      pointId: record.qdrantPointId,
      documentId: input.id,
    });
  }

  await KnowledgeModel.deleteOne({ _id: document._id });

  logger.info("Knowledge document deleted from MongoDB", { documentId: input.id });

  return { id: input.id };
}
