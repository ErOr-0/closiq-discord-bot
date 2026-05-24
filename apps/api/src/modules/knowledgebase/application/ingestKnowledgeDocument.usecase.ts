import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

import { Types } from "mongoose";

import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { createEmbedding } from "../../../infrastructure/ai/openAiProvider";
import {
  deleteKnowledgeObjects,
  uploadKnowledgeObject,
} from "../../../infrastructure/storage/minio";
import { qdrantClient } from "../../../infrastructure/vector/qdrant";
import { KnowledgeModel } from "../infrastructure/knowledge.model";
import { toKnowledgeDocument } from "./knowledge.mapper";

export type KnowledgeUploadFile = {
  buffer: Buffer;
  originalName: string;
  mimeType?: string;
};

export type IngestKnowledgeDocumentInput = {
  title: string;
  content: string;
  source?: string;
  tags?: string[];
  file?: KnowledgeUploadFile;
};

type KnowledgeStorageLocation = {
  folder: string;
  objectKey: string;
  originalName: string;
};

export async function ingestKnowledgeDocument(input: IngestKnowledgeDocumentInput) {
  const documentId = new Types.ObjectId();
  const pointId = randomUUID();
  const storageLocation = buildKnowledgeStorageLocation({
    documentId: String(documentId),
    title: input.title,
    originalName: input.file?.originalName,
  });
  const storageBuffer = input.file?.buffer ?? Buffer.from(input.content, "utf8");
  const storageContentType = input.file?.mimeType ?? "text/plain; charset=utf-8";

  const uploadedObject = await uploadKnowledgeObject({
    objectKey: storageLocation.objectKey,
    buffer: storageBuffer,
    contentType: storageContentType,
    metadata: {
      documentId: String(documentId),
      title: input.title,
      source: input.source ?? "internal",
    },
  });

  let document;

  try {
    document = await KnowledgeModel.create({
      _id: documentId,
      title: input.title,
      content: input.content,
      source: input.source,
      tags: input.tags ?? [],
      qdrantPointId: pointId,
      storage: uploadedObject
        ? {
            provider: "minio",
            bucket: uploadedObject.bucket,
            objectKey: uploadedObject.objectKey,
            folder: storageLocation.folder,
            originalName: storageLocation.originalName,
            contentType: storageContentType,
            size: storageBuffer.byteLength,
          }
        : undefined,
    });
  } catch (error) {
    if (uploadedObject) {
      await deleteKnowledgeObjects([uploadedObject.objectKey]).catch((cleanupError) => {
        logger.warn("Failed to clean up MinIO object after MongoDB save failure", {
          objectKey: uploadedObject.objectKey,
          error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
        });
      });
    }

    throw error;
  }

  try {
    const embedding = await createEmbedding(`${input.title}\n\n${input.content}`);

    await qdrantClient.upsert(env.QDRANT_COLLECTION, {
      wait: true,
      points: [
        {
          id: pointId,
          vector: embedding,
          payload: {
            documentId: String(document._id),
            title: input.title,
            content: input.content,
            source: input.source,
            tags: input.tags ?? [],
            storageBucket: uploadedObject?.bucket,
            storageObjectKey: uploadedObject?.objectKey,
            storageFolder: storageLocation.folder,
          },
        },
      ],
    });
  } catch (error) {
    logger.warn("Knowledge document saved to MongoDB/MinIO but Qdrant sync failed", {
      documentId: String(document._id),
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return toKnowledgeDocument(document.toObject());
}

function buildKnowledgeStorageLocation(input: {
  documentId: string;
  title: string;
  originalName?: string;
}): KnowledgeStorageLocation {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const folder = `knowledge-sets/${year}/${month}/${day}/${input.documentId}`;
  const originalName = sanitizeFileName(
    input.originalName ?? `${slugify(input.title, "knowledge")}.txt`,
    "knowledge.txt"
  );

  return {
    folder,
    objectKey: `${folder}/${originalName}`,
    originalName,
  };
}

function sanitizeFileName(value: string, fallback: string) {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[\\/]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return sanitized || fallback;
}

function slugify(value: string, fallback: string) {
  return sanitizeFileName(value.toLowerCase(), fallback).replace(/\.[^.]+$/, "") || fallback;
}
