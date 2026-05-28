import { QdrantClient } from "@qdrant/js-client-rest";

import { env } from "../../config/env";
import { logger } from "../../config/logger";

export const VECTOR_SIZE = 1536;

export const qdrantClient = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY,
  checkCompatibility: false,
});

export async function ensureQdrantCollection() {
  const collections = await qdrantClient.getCollections();
  const exists = collections.collections.some(
    (collection) => collection.name === env.QDRANT_COLLECTION
  );

  if (exists) {
    logger.info("Qdrant collection already exists", { collection: env.QDRANT_COLLECTION });
    return;
  }

  await qdrantClient.createCollection(env.QDRANT_COLLECTION, {
    vectors: {
      size: VECTOR_SIZE,
      distance: "Cosine",
    },
  });

  logger.info("Qdrant collection created", { collection: env.QDRANT_COLLECTION });
}
