import { Router } from "express";

import { asyncHandler } from "../../../shared/utils/asyncHandler";
import {
  completeOrderController,
  listOrdersController,
} from "../controllers/orders.controller";

export const ordersRouter = Router();

ordersRouter.get("/", asyncHandler(listOrdersController));
ordersRouter.patch("/:orderId/complete", asyncHandler(completeOrderController));
