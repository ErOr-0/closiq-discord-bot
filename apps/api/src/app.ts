import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { agentRouter } from "./modules/agent/presentation/agent.routes";
import { healthRouter } from "./modules/health/presentation/health.routes";
import { knowledgebaseRouter } from "./modules/knowledgebase/presentation/knowledgebase.routes";
import { messagesRouter } from "./modules/messages/presentation/messages.routes";
import { errorHandler, notFoundHandler } from "./shared/middleware/errorHandler";
import { requestLogger } from "./shared/middleware/requestLogger";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

app.get("/", (_req, res) => {
  res.json({
    data: {
      service: "closiq-discord-agent-api",
      docs: "/api/health",
    },
  });
});

app.use("/api/health", healthRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/knowledgebase", knowledgebaseRouter);
app.use("/api/agent", agentRouter);

app.use(notFoundHandler);
app.use(errorHandler);
