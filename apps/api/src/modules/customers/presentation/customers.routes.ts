import { Router } from "express";
import { z } from "zod";

import { CustomerModel } from "../infrastructure/customer.model";
import { OrderModel } from "../../orders/infrastructure/order.model";
import { asyncHandler } from "../../../shared/utils/asyncHandler";

export const customersRouter = Router();

// GET /api/customers - fetch all customers with their orders and lead status
customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const customers = await CustomerModel.find().sort({ createdAt: -1 }).lean();

    const data = await Promise.all(
      customers.map(async (customer) => {
        const orders = await OrderModel.find({ customerId: customer._id })
          .sort({ createdAt: -1 })
          .lean();

        return {
          id: String(customer._id),
          discordId: customer.discordId,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          leadStatus: customer.leadStatus || "new",
          orders: orders.map((order) => ({
            id: String(order._id),
            items: order.items,
            totalAmount: order.totalAmount,
            status: order.status,
            createdAt: order.createdAt,
          })),
          createdAt: customer.createdAt,
        };
      })
    );

    res.json({ data });
  })
);

// PATCH /api/customers/:id/lead-status - update a customer's lead status
customersRouter.patch(
  "/:id/lead-status",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { leadStatus } = z.object({
      leadStatus: z.enum(["new", "contacted", "qualified", "unqualified", "converted"]),
    }).parse(req.body);

    const customer = await CustomerModel.findByIdAndUpdate(
      id,
      { leadStatus },
      { new: true }
    ).lean();

    if (!customer) {
      res.status(404).json({
        error: {
          message: "Customer not found.",
          statusCode: 404,
        },
      });
      return;
    }

    res.json({ data: customer });
  })
);
