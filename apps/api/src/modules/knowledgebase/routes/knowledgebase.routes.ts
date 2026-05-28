import { Router } from "express";

import { asyncHandler } from "../../../shared/utils/asyncHandler";
import {
  createKnowledge,
  deleteKnowledge,
  listKnowledge,
  searchKnowledgebase,
} from "../controllers/knowledgebase.controller";
import { uploadKnowledgeFile } from "../middlewares/uploadKnowledge.middleware";

export const knowledgebaseRouter = Router();

knowledgebaseRouter.get("/", asyncHandler(listKnowledge));
knowledgebaseRouter.post("/", uploadKnowledgeFile.single("file"), asyncHandler(createKnowledge));
knowledgebaseRouter.delete("/:id", asyncHandler(deleteKnowledge));
knowledgebaseRouter.post("/search", asyncHandler(searchKnowledgebase));
