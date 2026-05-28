import OpenAI from "openai";

import { env } from "../../config/env";
import { VECTOR_SIZE } from "../vector/qdrant";

const openAiClient = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

export async function createEmbedding(text: string): Promise<number[]> {
  if (!openAiClient) {
    return createDeterministicEmbedding(text);
  }

  const response = await openAiClient.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0]?.embedding ?? createDeterministicEmbedding(text);
}

function createDeterministicEmbedding(text: string) {
  const vector = Array.from({ length: VECTOR_SIZE }, () => 0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

  for (const token of tokens) {
    const index = hash(token) % VECTOR_SIZE;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}

function hash(value: string) {
  let result = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }

  return result >>> 0;
}
