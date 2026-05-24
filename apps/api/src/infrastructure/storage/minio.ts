import { Buffer } from "node:buffer";

import { Client } from "minio";

import { env } from "../../config/env";
import { logger } from "../../config/logger";

type MinioEndpointConfig = {
  endPoint: string;
  port: number;
  useSSL: boolean;
};

export type UploadedKnowledgeObject = {
  bucket: string;
  objectKey: string;
};

function parseEndpoint(endpoint: string): MinioEndpointConfig {
  const url = new URL(endpoint);
  const useSSL = url.protocol === "https:";
  const port = url.port ? Number(url.port) : useSSL ? 443 : 80;

  return {
    endPoint: url.hostname,
    port,
    useSSL,
  };
}

function createMinioClient() {
  if (!env.MINIO_ENDPOINT || !env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY) {
    return null;
  }

  const endpoint = parseEndpoint(env.MINIO_ENDPOINT);

  return new Client({
    ...endpoint,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    region: env.MINIO_REGION,
    pathStyle: true,
  });
}

export const minioClient = createMinioClient();

let bucketReadyPromise: Promise<void> | null = null;

export function isMinioConfigured() {
  return Boolean(minioClient && env.MINIO_BUCKET);
}

export async function ensureMinioBucket() {
  if (!minioClient || !env.MINIO_BUCKET) {
    logger.warn("MinIO is not fully configured; knowledge object storage is disabled");
    return;
  }

  const bucket = env.MINIO_BUCKET;

  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const exists = await minioClient.bucketExists(bucket);

      if (!exists) {
        await minioClient.makeBucket(bucket, env.MINIO_REGION);
        logger.info("MinIO bucket created", { bucket });
        return;
      }

      logger.info("MinIO bucket already exists", { bucket });
    })().catch((error) => {
      bucketReadyPromise = null;
      throw error;
    });
  }

  await bucketReadyPromise;
}

export async function uploadKnowledgeObject(input: {
  objectKey: string;
  buffer: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}): Promise<UploadedKnowledgeObject | undefined> {
  if (!isMinioConfigured()) {
    logger.warn("Skipping MinIO knowledge object upload because MinIO is not configured", {
      objectKey: input.objectKey,
    });
    return undefined;
  }

  await ensureMinioBucket();

  await minioClient!.putObject(
    env.MINIO_BUCKET!,
    input.objectKey,
    input.buffer,
    input.buffer.byteLength,
    {
      "Content-Type": input.contentType ?? "text/plain; charset=utf-8",
      ...input.metadata,
    }
  );

  logger.info("Knowledge object uploaded to MinIO", {
    bucket: env.MINIO_BUCKET,
    objectKey: input.objectKey,
  });

  return {
    bucket: env.MINIO_BUCKET!,
    objectKey: input.objectKey,
  };
}

export async function deleteKnowledgeObjects(objectKeys: Array<string | null | undefined>) {
  const keys = Array.from(new Set(objectKeys.filter((key): key is string => Boolean(key))));

  if (!keys.length) {
    return;
  }

  if (!isMinioConfigured()) {
    logger.warn("Skipping MinIO knowledge object deletion because MinIO is not configured", {
      objectKeys: keys,
    });
    return;
  }

  await ensureMinioBucket();

  for (const objectKey of keys) {
    await minioClient!.removeObject(env.MINIO_BUCKET!, objectKey);
    logger.info("Knowledge object deleted from MinIO", {
      bucket: env.MINIO_BUCKET,
      objectKey,
    });
  }
}
