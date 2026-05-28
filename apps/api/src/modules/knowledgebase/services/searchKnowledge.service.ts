import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import { createEmbedding } from "../../../integrations/ai/openAiEmbedding.provider";
import { qdrantClient } from "../../../integrations/vector/qdrant";
import { KnowledgeModel } from "../models/knowledge.model";
import type { KnowledgeSearchResult } from "../types/knowledgeDocument";

export async function searchKnowledge(input: { query: string; limit?: number }) {
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);

  try {
    const embedding = await createEmbedding(input.query);
    const hits = await qdrantClient.search(env.QDRANT_COLLECTION, {
      vector: embedding,
      limit,
      with_payload: true,
    });

    return hits.map((hit) => {
      const payload = (hit.payload ?? {}) as Record<string, unknown>;

      return {
        id: String(payload.documentId ?? hit.id),
        title: stringifyPayload(payload.title, "Untitled document"),
        content: stringifyPayload(payload.content, ""),
        source: payload.source ? String(payload.source) : undefined,
        tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
        score: hit.score,
      } satisfies KnowledgeSearchResult;
    });
  } catch (error) {
    logger.warn("Qdrant search failed; falling back to MongoDB text search", {
      error: error instanceof Error ? error.message : String(error),
    });

    return searchMongo(input.query, limit);
  }
}

async function searchMongo(query: string, limit: number): Promise<KnowledgeSearchResult[]> {
  const textResults = await KnowledgeModel.find(
    { $text: { $search: query } },
    { score: { $meta: "textScore" } }
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .lean()
    .catch(() => []);

  const records = textResults.length
    ? textResults
    : await KnowledgeModel.find({
        $or: [
          { title: new RegExp(escapeRegex(query), "i") },
          { content: new RegExp(escapeRegex(query), "i") },
          { tags: new RegExp(escapeRegex(query), "i") },
        ],
      })
        .limit(limit)
        .lean();

  return records.map((record) => ({
    id: String(record._id),
    title: record.title,
    content: record.content,
    source: record.source ?? undefined,
    tags: record.tags ?? [],
    score: typeof record.score === "number" ? record.score : undefined,
  }));
}

function stringifyPayload(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
