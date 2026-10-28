import { Router } from "express";
import { asyncHandler } from "../lib/async-handler";
import { businessIdFrom, fromMinor } from "../lib/tenant";
import { HttpError } from "../lib/errors";
import { authenticate, requireBusiness } from "../middleware/authenticate";
import {
  Customer,
  Expense,
  Product,
  Purchase,
  Sale,
  Supplier,
} from "../models";

const router = Router();
router.use(authenticate, requireBusiness);

router.get(
  "/sales",
  asyncHandler(async (request, response) => {
    const businessId = businessIdFrom(request);
    const range = dateRange(request.query.from, request.query.to);
    const rows = await Sale.aggregate([
      {
        $match: {
          businessId,
          status: { $nin: ["voided", "refunded"] },
          ...(Object.keys(range).length ? { createdAt: range } : {}),
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          saleCount: { $sum: 1 },
          grossSalesMinor: { $sum: "$totalMinor" },
          refundsMinor: { $sum: "$refundedMinor" },
          amountPaidMinor: { $sum: "$amountPaidMinor" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const summary = rows.reduce(
      (totals, row) => ({
        saleCount: totals.saleCount + row.saleCount,
        netSalesMinor:
          totals.netSalesMinor + row.grossSalesMinor - row.refundsMinor,
        refundsMinor: totals.refundsMinor + row.refundsMinor,
        amountPaidMinor: totals.amountPaidMinor + row.amountPaidMinor,
      }),
      { saleCount: 0, netSalesMinor: 0, refundsMinor: 0, amountPaidMinor: 0 },
    );
    response.json({
      success: true,
      message: "Sales report retrieved successfully.",
      data: {
        summary: {
          ...summary,
          netSales: fromMinor(summary.netSalesMinor),
          refunds: fromMinor(summary.refundsMinor),
          amountPaid: fromMinor(summary.amountPaidMinor),
        },
        rows: rows.map((row) => ({
          date: row._id,
          saleCount: row.saleCount,
          netSales: fromMinor(row.grossSalesMinor - row.refundsMinor),
          refunds: fromMinor(row.refundsMinor),
          amountPaid: fromMinor(row.amountPaidMinor),
        })),
      },
    });
  }),
);

router.get(
  "/inventory",
  asyncHandler(async (request, response) => {
    const businessId = businessIdFrom(request);
    const [summary, lowStock] = await Promise.all([
      Product.aggregate([
        { $match: { businessId, isActive: true } },
        {
          $group: {
            _id: null,
            products: { $sum: 1 },
            lowStock: {
              $sum: { $cond: [{ $lte: ["$stock", "$reorderLevel"] }, 1, 0] },
            },
            unitsOnHand: { $sum: "$stock" },
            stockCostMinor: {
              $sum: { $multiply: ["$stock", "$costPriceMinor"] },
            },
            stockRetailMinor: {
              $sum: { $multiply: ["$stock", "$sellingPriceMinor"] },
            },
          },
        },
      ]),
      Product.find({
        businessId,
        isActive: true,
        $expr: { $lte: ["$stock", "$reorderLevel"] },
      })
        .sort({ stock: 1, name: 1 })
        .limit(100),
    ]);
    const totals = summary[0] ?? {
      products: 0,
      lowStock: 0,
      unitsOnHand: 0,
      stockCostMinor: 0,
      stockRetailMinor: 0,
    };
    response.json({
      success: true,
      message: "Inventory report retrieved successfully.",
      data: {
        ...totals,
        stockCost: fromMinor(totals.stockCostMinor),
        stockRetail: fromMinor(totals.stockRetailMinor),
        lowStockProducts: lowStock.map((product) => ({
          id: product._id.toString(),
          name: product.name,
          sku: product.sku,
          stock: product.stock,
          reorderLevel: product.reorderLevel,
          unit: product.unit,
        })),
      },
    });
  }),
);

router.get(
  "/expenses",
  asyncHandler(async (request, response) => {
    const businessId = businessIdFrom(request);
    const range = dateRange(request.query.from, request.query.to);
    const rows = await Expense.aggregate([
      {
        $match: {
          businessId,
          isVoided: false,
          ...(Object.keys(range).length ? { date: range } : {}),
        },
      },
      {
        $group: {
          _id: "$category",
          totalMinor: { $sum: "$amountMinor" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalMinor: -1 } },
    ]);
    const totalMinor = rows.reduce((sum, row) => sum + row.totalMinor, 0);
    response.json({
      success: true,
      message: "Expense report retrieved successfully.",
      data: {
        total: fromMinor(totalMinor),
        count: rows.reduce((sum, row) => sum + row.count, 0),
        categories: rows.map((row) => ({
          category: row._id,
          total: fromMinor(row.totalMinor),
          count: row.count,
        })),
      },
    });
  }),
);

router.get(
  "/profit",
  asyncHandler(async (request, response) => {
    const businessId = businessIdFrom(request);
    const range = dateRange(request.query.from, request.query.to);
    const [sales, expenses, purchases] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            businessId,
            status: { $nin: ["voided", "refunded"] },
            ...(Object.keys(range).length ? { createdAt: range } : {}),
          },
        },
        { $unwind: "$lines" },
        {
          $set: {
            lineGrossMinor: {
              $multiply: [
                "$lines.unitPriceMinor",
                { $subtract: ["$lines.quantity", "$lines.returnedQuantity"] },
              ],
            },
            discountAllocationMinor: {
              $cond: [
                { $gt: ["$subtotalMinor", 0] },
                {
                  $multiply: [
                    "$discountMinor",
                    {
                      $divide: [
                        {
                          $multiply: [
                            "$lines.unitPriceMinor",
                            "$lines.quantity",
                          ],
                        },
                        "$subtotalMinor",
                      ],
                    },
                  ],
                },
                0,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            netSalesMinor: {
              $sum: {
                $subtract: ["$lineGrossMinor", "$discountAllocationMinor"],
              },
            },
            costOfGoodsMinor: {
              $sum: {
                $multiply: [
                  "$lines.unitCostMinor",
                  { $subtract: ["$lines.quantity", "$lines.returnedQuantity"] },
                ],
              },
            },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            businessId,
            isVoided: false,
            ...(Object.keys(range).length ? { date: range } : {}),
          },
        },
        { $group: { _id: null, totalMinor: { $sum: "$amountMinor" } } },
      ]),
      Purchase.aggregate([
        {
          $match: {
            businessId,
            status: "Received",
            ...(Object.keys(range).length ? { date: range } : {}),
          },
        },
        { $group: { _id: null, totalMinor: { $sum: "$totalMinor" } } },
      ]),
    ]);
    const netSalesMinor = sales[0]?.netSalesMinor ?? 0;
    const costOfGoodsMinor = sales[0]?.costOfGoodsMinor ?? 0;
    const expenseMinor = expenses[0]?.totalMinor ?? 0;
    response.json({
      success: true,
      message: "Profit report retrieved successfully.",
      data: {
        netSales: fromMinor(netSalesMinor),
        costOfGoodsSold: fromMinor(costOfGoodsMinor),
        grossProfit: fromMinor(netSalesMinor - costOfGoodsMinor),
        expenses: fromMinor(expenseMinor),
        estimatedNetProfit: fromMinor(
          netSalesMinor - costOfGoodsMinor - expenseMinor,
        ),
        receivedPurchases: fromMinor(purchases[0]?.totalMinor ?? 0),
        note: "Profit is an estimate based on sale-time product cost snapshots and recorded operating expenses.",
      },
    });
  }),
);

router.get(
  "/dashboard",
  asyncHandler(async (request, response) => {
    const businessId = businessIdFrom(request);
    const now = new Date();
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const [
      todaySales,
      monthSales,
      products,
      expenses,
      customerBalances,
      supplierBalances,
      recentSales,
    ] = await Promise.all([
      Sale.aggregate([
        {
          $match: {
            businessId,
            createdAt: { $gte: dayStart },
            status: { $nin: ["voided", "refunded"] },
          },
        },
        {
          $group: {
            _id: null,
            totalMinor: { $sum: "$totalMinor" },
            count: { $sum: 1 },
          },
        },
      ]),
      Sale.aggregate([
        {
          $match: {
            businessId,
            createdAt: { $gte: monthStart },
            status: { $nin: ["voided", "refunded"] },
          },
        },
        {
          $group: {
            _id: null,
            totalMinor: { $sum: "$totalMinor" },
            count: { $sum: 1 },
          },
        },
      ]),
      Product.aggregate([
        { $match: { businessId, isActive: true } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            lowStock: {
              $sum: { $cond: [{ $lte: ["$stock", "$reorderLevel"] }, 1, 0] },
            },
            stockCostMinor: {
              $sum: { $multiply: ["$stock", "$costPriceMinor"] },
            },
          },
        },
      ]),
      Expense.aggregate([
        { $match: { businessId, date: { $gte: dayStart }, isVoided: false } },
        {
          $group: {
            _id: null,
            totalMinor: { $sum: "$amountMinor" },
            count: { $sum: 1 },
          },
        },
      ]),
      Customer.aggregate([
        { $match: { businessId, isActive: true } },
        { $group: { _id: null, totalMinor: { $sum: "$balanceMinor" } } },
      ]),
      Supplier.aggregate([
        { $match: { businessId, isActive: true } },
        { $group: { _id: null, totalMinor: { $sum: "$balanceMinor" } } },
      ]),
      Sale.find({ businessId, status: { $nin: ["voided", "refunded"] } })
        .sort({ createdAt: -1 })
        .limit(6),
    ]);
    response.json({
      success: true,
      message: "Dashboard summary retrieved successfully.",
      data: {
        today: {
          sales: fromMinor(todaySales[0]?.totalMinor ?? 0),
          receipts: todaySales[0]?.count ?? 0,
          expenses: fromMinor(expenses[0]?.totalMinor ?? 0),
          expenseCount: expenses[0]?.count ?? 0,
        },
        month: {
          sales: fromMinor(monthSales[0]?.totalMinor ?? 0),
          receipts: monthSales[0]?.count ?? 0,
        },
        inventory: {
          products: products[0]?.count ?? 0,
          lowStock: products[0]?.lowStock ?? 0,
          value: fromMinor(products[0]?.stockCostMinor ?? 0),
        },
        customerBalances: fromMinor(customerBalances[0]?.totalMinor ?? 0),
        supplierBalances: fromMinor(supplierBalances[0]?.totalMinor ?? 0),
        recentSales: recentSales.map((sale: InstanceType<typeof Sale>) => ({
          id: sale._id.toString(),
          receipt: sale.receipt,
          customer: sale.customer,
          total: fromMinor(sale.totalMinor),
          amountPaid: fromMinor(sale.amountPaidMinor),
          createdAt: sale.createdAt,
        })),
      },
    });
  }),
);

function dateRange(from: unknown, to: unknown) {
  const range: Record<string, Date> = {};
  if (typeof from === "string") {
    const date = new Date(from);
    if (!Number.isFinite(date.getTime()))
      throw new HttpError(400, "Invalid start date.", "INVALID_DATE");
    range.$gte = date;
  }
  if (typeof to === "string") {
    const date = new Date(to);
    if (!Number.isFinite(date.getTime()))
      throw new HttpError(400, "Invalid end date.", "INVALID_DATE");
    date.setUTCHours(23, 59, 59, 999);
    range.$lte = date;
  }
  return range;
}

export default router;
