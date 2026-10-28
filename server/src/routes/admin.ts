import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler";
import { HttpError } from "../lib/errors";
import { objectId, paginatedQuery } from "../lib/tenant";
import { authenticate } from "../middleware/authenticate";
import { requireSuperAdmin } from "../middleware/authorize";
import {
  AuditLog,
  AuthSession,
  Business,
  Customer,
  Expense,
  Membership,
  Product,
  Purchase,
  Sale,
  Supplier,
  User,
} from "../models";
import { recordAudit } from "../services/audit";

const router = Router();
router.use(authenticate, requireSuperAdmin);

router.get(
  "/overview",
  asyncHandler(async (_request, response) => {
    const [
      businesses,
      activeBusinesses,
      suspendedBusinesses,
      users,
      sales,
      revenue,
    ] = await Promise.all([
      Business.countDocuments(),
      Business.countDocuments({ status: "active" }),
      Business.countDocuments({ status: "suspended" }),
      User.countDocuments({ platformRole: "user" }),
      Sale.countDocuments({ status: { $nin: ["voided", "refunded"] } }),
      Sale.aggregate([
        { $match: { status: { $nin: ["voided", "refunded"] } } },
        {
          $group: {
            _id: null,
            totalMinor: {
              $sum: { $subtract: ["$totalMinor", "$refundedMinor"] },
            },
          },
        },
      ]),
    ]);
    response.json({
      success: true,
      message: "Platform overview retrieved successfully.",
      data: {
        businesses,
        activeBusinesses,
        suspendedBusinesses,
        users,
        sales,
        netRevenueMinor: revenue[0]?.totalMinor ?? 0,
      },
    });
  }),
);

router.get(
  "/businesses",
  asyncHandler(async (request, response) => {
    const { page, limit, skip } = paginatedQuery(
      request.query as Record<string, unknown>,
    );
    const filter: Record<string, unknown> = {};
    if (
      request.query.status === "active" ||
      request.query.status === "suspended"
    )
      filter.status = request.query.status;
    if (
      typeof request.query.search === "string" &&
      request.query.search.trim()
    ) {
      const search = request.query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { ownerId: { $in: users.map((user) => user._id) } },
      ];
    }
    const [businesses, total] = await Promise.all([
      Business.find(filter)
        .populate("ownerId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Business.countDocuments(filter),
    ]);
    const ids = businesses.map((business) => business._id);
    const [sales, products, customers, suppliers] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            businessId: { $in: ids },
            status: { $nin: ["voided", "refunded"] },
          },
        },
        {
          $group: {
            _id: "$businessId",
            count: { $sum: 1 },
            revenueMinor: {
              $sum: { $subtract: ["$totalMinor", "$refundedMinor"] },
            },
          },
        },
      ]),
      Product.aggregate([
        { $match: { businessId: { $in: ids }, isActive: true } },
        {
          $group: {
            _id: "$businessId",
            count: { $sum: 1 },
            lowStock: {
              $sum: { $cond: [{ $lte: ["$stock", "$reorderLevel"] }, 1, 0] },
            },
          },
        },
      ]),
      Customer.aggregate([
        { $match: { businessId: { $in: ids }, isActive: true } },
        {
          $group: {
            _id: "$businessId",
            count: { $sum: 1 },
            balanceMinor: { $sum: "$balanceMinor" },
          },
        },
      ]),
      Supplier.aggregate([
        { $match: { businessId: { $in: ids }, isActive: true } },
        {
          $group: {
            _id: "$businessId",
            count: { $sum: 1 },
            balanceMinor: { $sum: "$balanceMinor" },
          },
        },
      ]),
    ]);
    const toMap = (rows: { _id: Types.ObjectId; [key: string]: unknown }[]) =>
      new Map(rows.map((row) => [row._id.toString(), row]));
    const salesById = toMap(sales);
    const productsById = toMap(products);
    const customersById = toMap(customers);
    const suppliersById = toMap(suppliers);
    response.json({
      success: true,
      message: "Businesses retrieved successfully.",
      data: businesses.map((business) => {
        const id = business._id.toString();
        const salesSummary = salesById.get(id);
        const productSummary = productsById.get(id);
        const customerSummary = customersById.get(id);
        const supplierSummary = suppliersById.get(id);
        return {
          id,
          name: business.name,
          status: business.status,
          currency: business.currency,
          createdAt: business.createdAt,
          owner: business.ownerId,
          metrics: {
            sales: salesSummary?.count ?? 0,
            netRevenueMinor: salesSummary?.revenueMinor ?? 0,
            products: productSummary?.count ?? 0,
            lowStock: productSummary?.lowStock ?? 0,
            customers: customerSummary?.count ?? 0,
            customerBalanceMinor: customerSummary?.balanceMinor ?? 0,
            suppliers: supplierSummary?.count ?? 0,
            supplierBalanceMinor: supplierSummary?.balanceMinor ?? 0,
          },
        };
      }),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.get(
  "/businesses/:id",
  asyncHandler(async (request, response) => {
    const business = await Business.findById(
      objectId(request.params.id),
    ).populate("ownerId", "name email status");
    if (!business)
      throw new HttpError(404, "Business not found.", "BUSINESS_NOT_FOUND");
    const businessId = business._id;
    const [members, products, sales, expenses, purchases] = await Promise.all([
      Membership.countDocuments({ businessId, status: "active" }),
      Product.countDocuments({ businessId, isActive: true }),
      Sale.aggregate([
        { $match: { businessId, status: { $nin: ["voided", "refunded"] } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenueMinor: {
              $sum: { $subtract: ["$totalMinor", "$refundedMinor"] },
            },
          },
        },
      ]),
      Expense.aggregate([
        { $match: { businessId, isVoided: false } },
        { $group: { _id: null, totalMinor: { $sum: "$amountMinor" } } },
      ]),
      Purchase.countDocuments({ businessId, status: { $ne: "Cancelled" } }),
    ]);
    response.json({
      success: true,
      message: "Business details retrieved successfully.",
      data: {
        business,
        metrics: {
          members,
          products,
          sales: sales[0]?.count ?? 0,
          netRevenueMinor: sales[0]?.revenueMinor ?? 0,
          expensesMinor: expenses[0]?.totalMinor ?? 0,
          purchases,
        },
      },
    });
  }),
);

router.patch(
  "/businesses/:id/status",
  asyncHandler(async (request, response) => {
    const input = z
      .object({
        status: z.enum(["active", "suspended"]),
        reason: z.string().trim().min(3).max(500),
      })
      .strict()
      .parse(request.body);
    const businessId = objectId(request.params.id);
    const business = await Business.findByIdAndUpdate(
      businessId,
      { $set: { status: input.status } },
      { new: true, runValidators: true },
    );
    if (!business)
      throw new HttpError(404, "Business not found.", "BUSINESS_NOT_FOUND");
    if (input.status === "suspended") {
      await AuthSession.updateMany(
        { businessId, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    }
    await recordAudit({
      userId: request.auth!.userId,
      action: `business.${input.status}`,
      entityType: "business",
      entityId: businessId,
      metadata: { reason: input.reason },
    });
    response.json({
      success: true,
      message: `Business ${input.status} successfully.`,
      data: business,
    });
  }),
);

router.get(
  "/audit-logs",
  asyncHandler(async (request, response) => {
    const { page, limit, skip } = paginatedQuery(
      request.query as Record<string, unknown>,
    );
    const filter: Record<string, unknown> = {};
    if (typeof request.query.businessId === "string")
      filter.businessId = objectId(request.query.businessId);
    if (typeof request.query.action === "string")
      filter.action = request.query.action;
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email"),
      AuditLog.countDocuments(filter),
    ]);
    response.json({
      success: true,
      message: "Audit logs retrieved successfully.",
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

export default router;
