import dotenv from "dotenv";
import path from "path";

// Load environment variables from the current directory, falling back to the project root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional()
);

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}, z.boolean());

const rawEnv = process.env;
const qdrantUrlFromHostAndPort = rawEnv.QDRANT_HOST
  ? `http://${rawEnv.QDRANT_HOST}:${rawEnv.QDRANT_PORT ?? "6333"}`
  : undefined;

const normalizedEnv = {
  ...rawEnv,
  QDRANT_URL: rawEnv.QDRANT_URL || qdrantUrlFromHostAndPort,
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),

  MONGODB_URI: z.string().default("mongodb://localhost:27017/closiq_discord_agent"),

  QDRANT_HOST: optionalString,
  QDRANT_PORT: z.coerce.number().int().positive().default(6333),
  QDRANT_URL: z.string().url().default("http://localhost:6333"),
  QDRANT_API_KEY: optionalString,
  QDRANT_COLLECTION: z.string().default("closiq_knowledgebase"),

  MINIO_ENDPOINT: z.string().url().default("http://localhost:9000"),
  MINIO_ACCESS_KEY: optionalString,
  MINIO_SECRET_KEY: optionalString,
  MINIO_BUCKET: optionalString,
  MINIO_REGION: z.string().default("us-east-1"),

  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

  OPENROUTER_API_KEY: optionalString,
  OPENROUTER_MODEL: z.string().default("google/gemma-4-26b-a4b-it"),
  OPENROUTER_FALLBACK_MODEL: optionalString,
  ENFORCE_CREDIT: booleanFromEnv.default(false),

  DISCORD_BOT_TOKEN: optionalString,
  DISCORD_CLIENT_ID: optionalString,
  DISCORD_GUILD_ID: optionalString,
  DISCORD_SUPPORT_CHANNEL_ID: optionalString,
  AUTO_REPLY_ENABLED: booleanFromEnv.default(true),
});

export const env = envSchema.parse(normalizedEnv);
export type Env = typeof env;
