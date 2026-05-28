import { KnowledgeModel } from "../models/knowledge.model";
import { type KnowledgeLike, toKnowledgeDocument } from "../mappers/knowledge.mapper";

export async function listKnowledgeDocuments(input?: { limit?: number }) {
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200);
  const records = await KnowledgeModel.find().sort({ createdAt: -1 }).limit(limit).lean();

  return records.map((record) => toKnowledgeDocument(record as unknown as KnowledgeLike));
}
