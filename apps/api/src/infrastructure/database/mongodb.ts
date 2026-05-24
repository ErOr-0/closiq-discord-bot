import mongoose from "mongoose";

import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { seedCommands } from "../../modules/agent/infrastructure/command.model";

export async function connectMongo() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI);
  logger.info("MongoDB connected");
  await seedCommands();
}

export async function disconnectMongo() {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected");
}
