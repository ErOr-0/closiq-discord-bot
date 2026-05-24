import { Router } from "express";

import { CustomerModel } from "../../customers/infrastructure/customer.model";
import { OrderModel } from "../../orders/infrastructure/order.model";
import { ThreadModel } from "../../messages/infrastructure/message.model";
import { asyncHandler } from "../../../shared/utils/asyncHandler";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/stats",
  asyncHandler(async (req, res) => {
    // 1. Customers Count
    const totalCustomers = await CustomerModel.countDocuments();

    // 2. Sales Metrics
    const orders = await OrderModel.find().lean();
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // 3. Leads Metrics (Pipeline Statuses)
    const customers = await CustomerModel.find({}, "leadStatus").lean();
    const leads = {
      new: customers.filter((c) => c.leadStatus === "new" || !c.leadStatus).length,
      contacted: customers.filter((c) => c.leadStatus === "contacted").length,
      qualified: customers.filter((c) => c.leadStatus === "qualified").length,
      unqualified: customers.filter((c) => c.leadStatus === "unqualified").length,
      converted: customers.filter((c) => c.leadStatus === "converted").length,
    };

    // 4. Recent Orders (Latest 5, populated with Customer details)
    const recentOrdersRaw = await OrderModel.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("customerId", "name email")
      .lean();

    const recentOrders = recentOrdersRaw.map((order) => {
      const customer = order.customerId as any;
      return {
        id: String(order._id),
        customerName: customer ? customer.name : "Unknown Customer",
        customerEmail: customer ? customer.email : "",
        itemsCount: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      };
    });

    // 5. Active Threads Statuses
    const openThreads = await ThreadModel.find({ status: "open" }).lean();
    const activeThreads = openThreads.map((thread) => ({
      id: String(thread._id),
      channelId: thread.channelId,
      authorId: thread.authorId,
      autoReply: thread.autoReply ?? true,
      createdAt: thread.createdAt,
    }));

    res.json({
      data: {
        totalCustomers,
        sales: {
          totalSales,
          totalOrders,
          averageOrderValue,
        },
        leads,
        recentOrders,
        activeThreads,
      },
    });
  })
);
