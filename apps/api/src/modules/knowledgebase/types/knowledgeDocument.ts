export type KnowledgeStorage = {
  provider: "minio";
  bucket: string;
  objectKey: string;
  folder: string;
  originalName: string;
  contentType?: string;
  size?: number;
};

export type KnowledgeDocument = {
  id: string;
  title: string;
  content: string;
  source?: string;
  tags: string[];
  qdrantPointId?: string;
  storage?: KnowledgeStorage;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeSearchResult = Pick<
  KnowledgeDocument,
  "id" | "title" | "content" | "source" | "tags"
> & {
  score?: number;
};
