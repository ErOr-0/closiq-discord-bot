import { Router } from "express";

import { asyncHandler } from "../../../shared/utils/asyncHandler";
import {
  createCustomerController,
  deleteCustomerController,
  listCustomersController,
  updateCustomerController,
} from "../controllers/customers.controller";

export const customersRouter = Router();

customersRouter.get("/", asyncHandler(listCustomersController));
customersRouter.post("/", asyncHandler(createCustomerController));
customersRouter.patch("/:customerId", asyncHandler(updateCustomerController));
customersRouter.delete("/:customerId", asyncHandler(deleteCustomerController));
