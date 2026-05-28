import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    data: {
      service: "closiq-discord-agent-api",
      status: "ok",
      timestamp: new Date().toISOString(),
    },
  });
});
