import type { Server } from "node:http";

import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectMongo, disconnectMongo } from "./integrations/database/mongodb";
import { startDiscordGateway } from "./integrations/discord/discordGateway";
import { ensureMinioBucket } from "./integrations/storage/minio";
import { ensureQdrantCollection } from "./integrations/vector/qdrant";

let httpServer: Server | null = null;
let discordClient: { destroy: () => void } | null = null;

async function bootstrap() {
  await connectMongo();

  try {
    await ensureQdrantCollection();
  } catch (error) {
    logger.warn("Qdrant collection check failed; API will keep running with MongoDB fallback", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await ensureMinioBucket();
  } catch (error) {
    logger.warn("MinIO bucket check failed; knowledge upload requests will report storage errors", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  discordClient = await startDiscordGateway();

  httpServer = app.listen(env.PORT, () => {
    logger.info("API server listening", { port: env.PORT });
  });
}

async function shutdown(signal: string) {
  logger.info("Shutdown requested", { signal });

  if (discordClient) {
    discordClient.destroy();
  }

  if (httpServer) {
    await new Promise<void>((resolve, reject) => {
      httpServer?.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await disconnectMongo();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

bootstrap().catch((error) => {
  logger.error("API bootstrap failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
