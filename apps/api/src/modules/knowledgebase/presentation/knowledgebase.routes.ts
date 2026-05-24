import { Router } from "express";
import multer from "multer";
import { z } from "zod";

import { AppError } from "../../../shared/errors/AppError";
import { asyncHandler } from "../../../shared/utils/asyncHandler";
import { deleteKnowledgeDocument } from "../application/deleteKnowledgeDocument.usecase";
import { ingestKnowledgeDocument } from "../application/ingestKnowledgeDocument.usecase";
import { listKnowledgeDocuments } from "../application/listKnowledgeDocuments.usecase";
import { searchKnowledge } from "../application/searchKnowledge.usecase";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

const createKnowledgeSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  source: optionalTrimmedString,
  tags: z.preprocess(normalizeTags, z.array(z.string().trim().min(1)).default([])),
});

const listKnowledgeSchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

const searchKnowledgeSchema = z.object({
  query: z.string().trim().min(1),
  limit: z.coerce.number().int().positive().max(20).optional(),
});

const deleteKnowledgeSchema = z.object({
  id: z.string().trim().min(1),
});

export const knowledgebaseRouter = Router();

knowledgebaseRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = listKnowledgeSchema.parse(req.query);
    const data = await listKnowledgeDocuments(query);

    res.json({ data });
  })
);

knowledgebaseRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const resolvedContent = resolveKnowledgeContent(req.body?.content, req.file);

    if (!resolvedContent) {
      throw new AppError(
        req.file
          ? "Uploaded file content could not be extracted. Add knowledge content or upload a text-like file."
          : "Knowledge content is required.",
        400
      );
    }

    const payload = createKnowledgeSchema.parse({
      ...req.body,
      content: resolvedContent,
    });
    const data = await ingestKnowledgeDocument({
      ...payload,
      file: req.file
        ? {
            buffer: req.file.buffer,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
          }
        : undefined,
    });

    res.status(201).json({ data });
  })
);

knowledgebaseRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const payload = deleteKnowledgeSchema.parse(req.params);
    const data = await deleteKnowledgeDocument(payload);

    res.json({ data });
  })
);

knowledgebaseRouter.post(
  "/search",
  asyncHandler(async (req, res) => {
    const payload = searchKnowledgeSchema.parse(req.body);
    const data = await searchKnowledge(payload);

    res.json({ data });
  })
);

function normalizeTags(value: unknown) {
  if (value === undefined || value === null) {
    return [];
  }

  const entries = Array.isArray(value) ? value : [value];

  return entries.flatMap((entry) => {
    if (typeof entry !== "string") {
      return [];
    }

    const trimmed = entry.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;

      if (Array.isArray(parsed)) {
        return parsed.map(String).map((tag) => tag.trim()).filter(Boolean);
      }
    } catch {
      // Fall back to comma-separated tags.
    }

    return trimmed
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  });
}

function resolveKnowledgeContent(content: unknown, file?: Express.Multer.File) {
  const bodyContent = typeof content === "string" ? content.trim() : "";

  if (bodyContent) {
    return bodyContent;
  }

  if (!file || !isTextLikeUpload(file)) {
    return "";
  }

  return file.buffer.toString("utf8").trim();
}

function isTextLikeUpload(file: Express.Multer.File) {
  const textLikeMimeTypes = new Set([
    "application/json",
    "application/javascript",
    "application/xml",
    "application/yaml",
    "application/x-yaml",
  ]);

  return (
    file.mimetype.startsWith("text/") ||
    textLikeMimeTypes.has(file.mimetype) ||
    /\.(txt|md|markdown|json|csv|tsv|yaml|yml|html|xml)$/i.test(file.originalname)
  );
}
