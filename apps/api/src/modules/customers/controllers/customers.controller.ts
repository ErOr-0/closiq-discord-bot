import type { Request, Response } from "express";
import { z } from "zod";

import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
} from "../services/customerMutations.service";
import { listCustomers } from "../services/listCustomers.service";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

const listCustomersSchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  search: optionalTrimmedString,
});

const customerParamsSchema = z.object({
  customerId: z.string().trim().min(1),
});

const createCustomerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  phone: optionalTrimmedString,
  discordId: optionalTrimmedString,
});

const updateCustomerSchema = createCustomerSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one customer field is required"
);

export async function listCustomersController(req: Request, res: Response) {
  const input = listCustomersSchema.parse(req.query);
  const data = await listCustomers(input);

  res.json({ data });
}

export async function createCustomerController(req: Request, res: Response) {
  const input = createCustomerSchema.parse(req.body);
  const data = await createCustomer(input);

  res.status(201).json({ data });
}

export async function updateCustomerController(req: Request, res: Response) {
  const params = customerParamsSchema.parse(req.params);
  const input = updateCustomerSchema.parse(req.body);
  const data = await updateCustomer(params.customerId, input);

  res.json({ data });
}

export async function deleteCustomerController(req: Request, res: Response) {
  const params = customerParamsSchema.parse(req.params);
  const data = await deleteCustomer(params.customerId);

  res.json({ data });
}
