import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";

import { logger } from "../../config/logger";
import { AppError } from "../errors/AppError";

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: "Validation failed",
        statusCode: 400,
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
        details: err.details,
      },
    });
    return;
  }

  logger.error("Unhandled request error", {
    path: req.originalUrl,
    method: req.method,
    error: err instanceof Error ? err.message : String(err),
  });

  res.status(500).json({
    error: {
      message: "Internal server error",
      statusCode: 500,
    },
  });
};
