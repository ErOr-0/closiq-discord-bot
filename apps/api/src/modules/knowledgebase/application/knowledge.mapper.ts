import type { KnowledgeDocument, KnowledgeStorage } from "../domain/knowledgeDocument";

export type KnowledgeStorageLike = {
  provider?: string | null;
  bucket?: string | null;
  objectKey?: string | null;
  folder?: string | null;
  originalName?: string | null;
  contentType?: string | null;
  size?: number | null;
};

export type KnowledgeLike = {
  _id: unknown;
  title: string;
  content: string;
  source?: string | null;
  tags?: string[];
  qdrantPointId?: string | null;
  storage?: KnowledgeStorageLike | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export function toKnowledgeDocument(record: KnowledgeLike): KnowledgeDocument {
  return {
    id: String(record._id),
    title: record.title,
    content: record.content,
    source: record.source ?? undefined,
    tags: record.tags ?? [],
    qdrantPointId: record.qdrantPointId ?? undefined,
    storage: toKnowledgeStorage(record.storage),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toKnowledgeStorage(storage?: KnowledgeStorageLike | null): KnowledgeStorage | undefined {
  if (
    !storage ||
    storage.provider !== "minio" ||
    !storage.bucket ||
    !storage.objectKey ||
    !storage.folder ||
    !storage.originalName
  ) {
    return undefined;
  }

  return {
    provider: "minio",
    bucket: storage.bucket,
    objectKey: storage.objectKey,
    folder: storage.folder,
    originalName: storage.originalName,
    contentType: storage.contentType ?? undefined,
    size: storage.size ?? undefined,
  };
}

function toIsoString(value?: Date | string) {
  if (!value) {
    return new Date().toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
