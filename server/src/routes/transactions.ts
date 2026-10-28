import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler";
import { HttpError } from "../lib/errors";
import {
  businessIdFrom,
  fromMinor,
  objectId,
  paginatedQuery,
  toMinor,
} from "../lib/tenant";
import { authenticate, requireBusiness } from "../middleware/authenticate";
import { allowRoles } from "../middleware/authorize";
import {
  Business,
  Customer,
  Expense,
  Payment,
  Product,
  Purchase,
  ReceiptCounter,
  Sale,
  SalesReturn,
  StockMovement,
  Supplier,
} from "../models";
import { recordAudit } from "../services/audit";

type SaleLineDocument = {
  productId: Types.ObjectId;
  name: string;
  sku: string;
  quantity: number;
  unitPriceMinor: number;
  unitCostMinor: number;
  returnedQuantity: number;
};

const router = Router();
router.use(authenticate, requireBusiness);

const saleInput = z
  .object({
    lines: z
      .array(
        z
          .object({ productId: z.string(), quantity: z.number().positive() })
          .strict(),
      )
      .min(1)
      .max(100),
    customerId: z.string().optional(),
    discount: z.number().min(0).default(0),
    tax: z.number().min(0).default(0),
    amountPaid: z.number().min(0),
    paymentMethod: z.string().trim().min(1).max(40),
  })
  .strict();

router.get(
  "/sales",
  asyncHandler(async (request, response) => {
    const { page, limit, skip } = paginatedQuery(
      request.query as Record<string, unknown>,
    );
    const businessId = businessIdFrom(request);
    const filter: Record<string, unknown> = {
      businessId,
      status: { $ne: "voided" },
    };
    if (
      typeof request.query.from === "string" ||
      typeof request.query.to === "string"
    ) {
      filter.createdAt = dateRange(request.query.from, request.query.to);
    }
    const [sales, total] = await Promise.all([
      Sale.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Sale.countDocuments(filter),
    ]);
    response.json({
      success: true,
      message: "Sales retrieved successfully.",
      data: sales.map(saleDto),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.post(
  "/sales",
  allowRoles("owner", "manager", "cashier"),
  asyncHandler(async (request, response) => {
    const input = saleInput.parse(request.body);
    const businessId = businessIdFrom(request);
    if (
      new Set(input.lines.map((line) => line.productId)).size !==
      input.lines.length
    ) {
      throw new HttpError(
        400,
        "Each product must appear only once in the sale.",
        "DUPLICATE_SALE_LINE",
      );
    }
    const productIds = input.lines.map((line) => objectId(line.productId));
    const transaction = await Sale.startSession();
    let createdSale: InstanceType<typeof Sale> | null = null;
    try {
      await transaction.withTransaction(async () => {
        const business =
          await Business.findById(businessId).session(transaction);
        if (!business || business.status !== "active")
          throw new HttpError(
            403,
            "Business account is unavailable.",
            "BUSINESS_DISABLED",
          );
        const products = await Product.find({
          _id: { $in: productIds },
          businessId,
          isActive: true,
        }).session(transaction);
        const productsById = new Map(
          products.map((product) => [product._id.toString(), product]),
        );
        if (productsById.size !== input.lines.length)
          throw new HttpError(
            404,
            "One or more products were not found.",
            "PRODUCT_NOT_FOUND",
          );

        const lines = input.lines.map((line) => {
          const product = productsById.get(line.productId);
          if (!product)
            throw new HttpError(404, "Product not found.", "PRODUCT_NOT_FOUND");
          if (product.stock < line.quantity)
            throw new HttpError(
              422,
              `${product.name} does not have enough stock.`,
              "INSUFFICIENT_STOCK",
            );
          return {
            product,
            quantity: line.quantity,
            lineMinor: Math.round(product.sellingPriceMinor * line.quantity),
          };
        });
        const subtotalMinor = lines.reduce(
          (sum, line) => sum + line.lineMinor,
          0,
        );
        const discountMinor = toMinor(input.discount);
        const taxMinor = toMinor(input.tax);
        if (discountMinor > subtotalMinor)
          throw new HttpError(
            422,
            "Discount cannot exceed the subtotal.",
            "INVALID_DISCOUNT",
          );
        const totalMinor = subtotalMinor - discountMinor + taxMinor;
        const amountPaidMinor = toMinor(input.amountPaid);
        if (amountPaidMinor > totalMinor)
          throw new HttpError(
            422,
            "Payment cannot exceed the sale total.",
            "PAYMENT_EXCEEDS_TOTAL",
          );
        const outstandingMinor = totalMinor - amountPaidMinor;
        if (outstandingMinor > 0 && !input.customerId)
          throw new HttpError(
            422,
            "A customer is required for an unpaid balance.",
            "CUSTOMER_REQUIRED_FOR_CREDIT",
          );

        const customer = input.customerId
          ? await Customer.findOne({
              _id: objectId(input.customerId),
              businessId,
              isActive: true,
            }).session(transaction)
          : null;
        if (input.customerId && !customer)
          throw new HttpError(404, "Customer not found.", "CUSTOMER_NOT_FOUND");
        if (
          customer &&
          customer.creditLimitMinor > 0 &&
          customer.balanceMinor + outstandingMinor > customer.creditLimitMinor
        ) {
          throw new HttpError(
            422,
            "This sale exceeds the customer's credit limit.",
            "CREDIT_LIMIT_EXCEEDED",
          );
        }

        let receipt: string;
        if (business.preferences.receiptNumbering) {
          const counter = await ReceiptCounter.findOneAndUpdate(
            { businessId },
            { $inc: { sequence: 1 } },
            {
              upsert: true,
              new: true,
              session: transaction,
              setDefaultsOnInsert: true,
            },
          );
          receipt = `#${counter?.sequence ?? Date.now()}`;
        } else {
          receipt = `#${Date.now().toString().slice(-8)}`;
        }
        const [sale] = await Sale.create(
          [
            {
              businessId,
              receipt,
              customerId: customer?._id ?? null,
              customer: customer?.name ?? "Walk-in customer",
              cashierId: request.auth!.userId,
              lines: lines.map(({ product, quantity }) => ({
                productId: product._id,
                name: product.name,
                sku: product.sku,
                quantity,
                unitPriceMinor: product.sellingPriceMinor,
                unitCostMinor: product.costPriceMinor,
              })),
              subtotalMinor,
              discountMinor,
              taxMinor,
              totalMinor,
              amountPaidMinor,
              paymentMethod: input.paymentMethod,
              paymentStatus:
                outstandingMinor === 0
                  ? "paid"
                  : amountPaidMinor > 0
                    ? "partially-paid"
                    : "unpaid",
            },
          ],
          { session: transaction },
        );

        for (const { product, quantity } of lines) {
          const before = product.stock;
          const updated = await Product.findOneAndUpdate(
            {
              _id: product._id,
              businessId,
              isActive: true,
              stock: { $gte: quantity },
            },
            { $inc: { stock: -quantity } },
            { new: true, session: transaction },
          );
          if (!updated)
            throw new HttpError(
              409,
              "Stock changed during checkout. Retry the sale.",
              "STOCK_CONFLICT",
            );
          await StockMovement.create(
            [
              {
                businessId,
                productId: product._id,
                movementType: "sale",
                quantityChange: -quantity,
                quantityBefore: before,
                quantityAfter: updated.stock,
                referenceType: "sale",
                referenceId: sale._id,
                performedBy: request.auth!.userId,
              },
            ],
            { session: transaction },
          );
        }
        if (customer && outstandingMinor > 0) {
          customer.balanceMinor += outstandingMinor;
          await customer.save({ session: transaction });
        }
        if (amountPaidMinor > 0) {
          await Payment.create(
            [
              {
                businessId,
                saleId: sale._id,
                customerId: customer?._id ?? null,
                type: "sale",
                amountMinor: amountPaidMinor,
                method: input.paymentMethod,
                receivedBy: request.auth!.userId,
              },
            ],
            { session: transaction },
          );
        }
        createdSale = sale;
      });
    } finally {
      await transaction.endSession();
    }
    if (!createdSale)
      throw new HttpError(500, "Sale could not be completed.", "SALE_FAILED");
    await recordAudit({
      businessId,
      userId: request.auth!.userId,
      action: "sale.completed",
      entityType: "sale",
      entityId: createdSale._id,
    });
    response.status(201).json({
      success: true,
      message: "Sale completed successfully.",
      data: saleDto(createdSale),
    });
  }),
);

router.get(
  "/sales/:id",
  asyncHandler(async (request, response) => {
    const sale = await Sale.findOne({
      _id: objectId(request.params.id),
      businessId: businessIdFrom(request),
    });
    if (!sale) throw new HttpError(404, "Sale not found.", "SALE_NOT_FOUND");
    response.json({
      success: true,
      message: "Sale retrieved successfully.",
      data: saleDto(sale),
    });
  }),
);

router.get(
  "/sales/:id/receipt",
  asyncHandler(async (request, response) => {
    const sale = await Sale.findOne({
      _id: objectId(request.params.id),
      businessId: businessIdFrom(request),
    });
    if (!sale) throw new HttpError(404, "Sale not found.", "SALE_NOT_FOUND");
    const business = await Business.findById(businessIdFrom(request)).select(
      "name currency contactDetails address",
    );
    response.json({
      success: true,
      message: "Receipt retrieved successfully.",
      data: { business, sale: saleDto(sale) },
    });
  }),
);

router.post(
  "/sales/:id/payments",
  allowRoles("owner", "manager", "cashier"),
  asyncHandler(async (request, response) => {
    const input = z
      .object({
        amount: z.number().positive(),
        method: z.string().trim().min(1).max(40),
        reference: z.string().trim().max(100).optional(),
      })
      .strict()
      .parse(request.body);
    const businessId = businessIdFrom(request);
    const saleId = objectId(request.params.id);
    const amountMinor = toMinor(input.amount);
    const transaction = await Sale.startSession();
    let newStatus = "";
    try {
      await transaction.withTransaction(async () => {
        const sale = await Sale.findOne({
          _id: saleId,
          businessId,
          status: { $nin: ["refunded", "voided"] },
        }).session(transaction);
        if (!sale)
          throw new HttpError(404, "Sale not found.", "SALE_NOT_FOUND");
        const balanceMinor =
          sale.totalMinor - sale.amountPaidMinor - sale.refundedMinor;
        if (amountMinor > balanceMinor)
          throw new HttpError(
            422,
            "Payment exceeds the outstanding balance.",
            "PAYMENT_EXCEEDS_BALANCE",
          );
        sale.amountPaidMinor += amountMinor;
        sale.paymentStatus =
          sale.amountPaidMinor + sale.refundedMinor >= sale.totalMinor
            ? "paid"
            : "partially-paid";
        await sale.save({ session: transaction });
        await Payment.create(
          [
            {
              businessId,
              saleId,
              customerId: sale.customerId,
              type: "sale",
              amountMinor,
              method: input.method,
              reference: input.reference,
              receivedBy: request.auth!.userId,
            },
          ],
          { session: transaction },
        );
        if (sale.customerId) {
          await Customer.updateOne(
            { _id: sale.customerId, businessId },
            { $inc: { balanceMinor: -amountMinor } },
            { session: transaction },
          );
        }
        newStatus = sale.paymentStatus;
      });
    } finally {
      await transaction.endSession();
    }
    response.status(201).json({
      success: true,
      message: "Payment recorded successfully.",
      data: { saleId: saleId.toString(), paymentStatus: newStatus },
    });
  }),
);

router.post(
  "/sales/:id/returns",
  allowRoles("owner", "manager"),
  asyncHandler(async (request, response) => {
    const input = z
      .object({
        items: z
          .array(
            z
              .object({
                productId: z.string(),
                quantity: z.number().positive(),
              })
              .strict(),
          )
          .min(1),
        reason: z.string().trim().min(3).max(300),
        restock: z.boolean().default(true),
      })
      .strict()
      .parse(request.body);
    const businessId = businessIdFrom(request);
    const saleId = objectId(request.params.id);
    const transaction = await Sale.startSession();
    let returnRecord: InstanceType<typeof SalesReturn> | null = null;
    try {
      await transaction.withTransaction(async () => {
        const sale = await Sale.findOne({
          _id: saleId,
          businessId,
          status: { $nin: ["refunded", "voided"] },
        }).session(transaction);
        if (!sale)
          throw new HttpError(404, "Sale not found.", "SALE_NOT_FOUND");
        const saleLineDocuments = sale.lines as SaleLineDocument[];
        const saleLines = new Map(
          saleLineDocuments.map((line) => [line.productId.toString(), line]),
        );
        const items: {
          productId: Types.ObjectId;
          name: string;
          quantity: number;
          amountMinor: number;
        }[] = [];
        for (const returned of input.items) {
          const line = saleLines.get(returned.productId);
          if (
            !line ||
            line.returnedQuantity + returned.quantity > line.quantity
          ) {
            throw new HttpError(
              422,
              "Return quantity exceeds the quantity sold.",
              "INVALID_RETURN_QUANTITY",
            );
          }
          const previouslyReturned = line.returnedQuantity;
          line.returnedQuantity += returned.quantity;
          const lineGrossMinor = Math.round(
            line.unitPriceMinor * line.quantity,
          );
          const subtotalShare =
            sale.subtotalMinor > 0 ? lineGrossMinor / sale.subtotalMinor : 0;
          const lineReturnTotalMinor = Math.round(
            lineGrossMinor -
              sale.discountMinor * subtotalShare +
              sale.taxMinor * subtotalShare,
          );
          const previouslyReturnedMinor = Math.round(
            (lineReturnTotalMinor * previouslyReturned) / line.quantity,
          );
          const amountMinor =
            Math.round(
              (lineReturnTotalMinor * line.returnedQuantity) / line.quantity,
            ) - previouslyReturnedMinor;
          items.push({
            productId: line.productId,
            name: line.name,
            quantity: returned.quantity,
            amountMinor,
          });
          if (input.restock) {
            const product = await Product.findOne({
              _id: line.productId,
              businessId,
            }).session(transaction);
            if (!product)
              throw new HttpError(
                404,
                "Returned product not found.",
                "PRODUCT_NOT_FOUND",
              );
            const before = product.stock;
            product.stock += returned.quantity;
            await product.save({ session: transaction });
            await StockMovement.create(
              [
                {
                  businessId,
                  productId: product._id,
                  movementType: "return",
                  quantityChange: returned.quantity,
                  quantityBefore: before,
                  quantityAfter: product.stock,
                  referenceType: "return",
                  performedBy: request.auth!.userId,
                },
              ],
              { session: transaction },
            );
          }
        }
        const totalMinor = items.reduce(
          (sum, item) => sum + item.amountMinor,
          0,
        );
        const outstandingBeforeReturn = Math.max(
          0,
          sale.totalMinor - sale.amountPaidMinor - sale.refundedMinor,
        );
        const debtReliefMinor = Math.min(totalMinor, outstandingBeforeReturn);
        const cashRefundMinor = totalMinor - debtReliefMinor;
        if (sale.customerId && debtReliefMinor > 0) {
          const customer = await Customer.findOneAndUpdate(
            {
              _id: sale.customerId,
              businessId,
              balanceMinor: { $gte: debtReliefMinor },
            },
            { $inc: { balanceMinor: -debtReliefMinor } },
            { new: true, session: transaction },
          );
          if (!customer) {
            throw new HttpError(
              409,
              "Customer balance does not match the outstanding sale balance.",
              "CUSTOMER_BALANCE_CONFLICT",
            );
          }
        }
        sale.refundedMinor += totalMinor;
        const allReturned = saleLineDocuments.every(
          (line) => line.returnedQuantity >= line.quantity,
        );
        sale.status = allReturned ? "refunded" : "partially-refunded";
        sale.paymentStatus = allReturned ? "refunded" : "partially-refunded";
        await sale.save({ session: transaction });
        const [record] = await SalesReturn.create(
          [
            {
              businessId,
              saleId,
              receipt: sale.receipt,
              items,
              totalMinor,
              reason: input.reason,
              restock: input.restock,
              processedBy: request.auth!.userId,
            },
          ],
          { session: transaction },
        );
        if (cashRefundMinor > 0) {
          await Payment.create(
            [
              {
                businessId,
                saleId,
                customerId: sale.customerId,
                type: "refund",
                amountMinor: cashRefundMinor,
                method: "Refund",
                receivedBy: request.auth!.userId,
              },
            ],
            { session: transaction },
          );
        }
        returnRecord = record;
      });
    } finally {
      await transaction.endSession();
    }
    response.status(201).json({
      success: true,
      message: "Return recorded successfully.",
      data: returnRecord,
    });
  }),
);

const purchaseInput = z
  .object({
    supplierId: z.string(),
    productId: z.string(),
    quantity: z.number().positive(),
    unitCost: z.number().min(0),
    amountPaid: z.number().min(0).default(0),
    status: z.enum(["Pending", "Received"]).default("Pending"),
  })
  .strict();

router.get(
  "/purchases",
  asyncHandler(async (request, response) => {
    const { page, limit, skip } = paginatedQuery(
      request.query as Record<string, unknown>,
    );
    const businessId = businessIdFrom(request);
    const filter = { businessId, status: { $ne: "Cancelled" } };
    const [purchases, total] = await Promise.all([
      Purchase.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Purchase.countDocuments(filter),
    ]);
    response.json({
      success: true,
      message: "Purchases retrieved successfully.",
      data: purchases.map(purchaseDto),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.post(
  "/purchases",
  allowRoles("owner", "manager", "inventory"),
  asyncHandler(async (request, response) => {
    const input = purchaseInput.parse(request.body);
    const businessId = businessIdFrom(request);
    const supplierId = objectId(input.supplierId);
    const productId = objectId(input.productId);
    const unitCostMinor = toMinor(input.unitCost);
    const totalMinor = Math.round(unitCostMinor * input.quantity);
    const amountPaidMinor = toMinor(input.amountPaid);
    if (amountPaidMinor > totalMinor)
      throw new HttpError(
        422,
        "Payment cannot exceed the purchase total.",
        "PAYMENT_EXCEEDS_TOTAL",
      );
    const transaction = await Purchase.startSession();
    let created: InstanceType<typeof Purchase> | null = null;
    try {
      await transaction.withTransaction(async () => {
        const [supplier, product] = await Promise.all([
          Supplier.findOne({
            _id: supplierId,
            businessId,
            isActive: true,
          }).session(transaction),
          Product.findOne({
            _id: productId,
            businessId,
            isActive: true,
          }).session(transaction),
        ]);
        if (!supplier)
          throw new HttpError(404, "Supplier not found.", "SUPPLIER_NOT_FOUND");
        if (!product)
          throw new HttpError(404, "Product not found.", "PRODUCT_NOT_FOUND");
        const sequence = Date.now().toString().slice(-8);
        const [purchase] = await Purchase.create(
          [
            {
              businessId,
              invoice: `PO-${sequence}`,
              supplierId,
              supplier: supplier.name,
              productId,
              productName: product.name,
              quantity: input.quantity,
              unitCostMinor,
              totalMinor,
              amountPaidMinor,
              status: input.status,
            },
          ],
          { session: transaction },
        );
        supplier.balanceMinor += totalMinor - amountPaidMinor;
        await supplier.save({ session: transaction });
        if (input.amountPaid > 0) {
          await Payment.create(
            [
              {
                businessId,
                supplierId,
                type: "supplier",
                amountMinor: amountPaidMinor,
                method: "Purchase payment",
                receivedBy: request.auth!.userId,
              },
            ],
            { session: transaction },
          );
        }
        if (input.status === "Received")
          await receiveStock(
            purchase,
            product,
            request.auth!.userId,
            transaction,
          );
        created = purchase;
      });
    } finally {
      await transaction.endSession();
    }
    if (!created)
      throw new HttpError(
        500,
        "Purchase could not be created.",
        "PURCHASE_FAILED",
      );
    response.status(201).json({
      success: true,
      message: "Purchase created successfully.",
      data: purchaseDto(created),
    });
  }),
);

router.post(
  "/purchases/:id/receive",
  allowRoles("owner", "manager", "inventory"),
  asyncHandler(async (request, response) => {
    const businessId = businessIdFrom(request);
    const transaction = await Purchase.startSession();
    let received: InstanceType<typeof Purchase> | null = null;
    try {
      await transaction.withTransaction(async () => {
        const purchase = await Purchase.findOne({
          _id: objectId(request.params.id),
          businessId,
        }).session(transaction);
        if (!purchase)
          throw new HttpError(404, "Purchase not found.", "PURCHASE_NOT_FOUND");
        if (purchase.status === "Received") {
          received = purchase;
          return;
        }
        if (purchase.status !== "Pending")
          throw new HttpError(
            409,
            "Cancelled purchases cannot be received.",
            "PURCHASE_NOT_RECEIVABLE",
          );
        const product = await Product.findOne({
          _id: purchase.productId,
          businessId,
          isActive: true,
        }).session(transaction);
        if (!product)
          throw new HttpError(404, "Product not found.", "PRODUCT_NOT_FOUND");
        await receiveStock(
          purchase,
          product,
          request.auth!.userId,
          transaction,
        );
        purchase.status = "Received";
        await purchase.save({ session: transaction });
        received = purchase;
      });
    } finally {
      await transaction.endSession();
    }
    response.json({
      success: true,
      message: "Purchase received successfully.",
      data: received ? purchaseDto(received) : null,
    });
  }),
);

async function receiveStock(
  purchase: InstanceType<typeof Purchase>,
  product: InstanceType<typeof Product>,
  userId: import("mongoose").Types.ObjectId,
  session: import("mongoose").ClientSession,
) {
  const before = product.stock;
  product.stock += purchase.quantity;
  await product.save({ session });
  await StockMovement.create(
    [
      {
        businessId: purchase.businessId,
        productId: product._id,
        movementType: "purchase",
        quantityChange: purchase.quantity,
        quantityBefore: before,
        quantityAfter: product.stock,
        referenceType: "purchase",
        referenceId: purchase._id,
        performedBy: userId,
      },
    ],
    { session },
  );
}

router.get(
  "/expenses",
  asyncHandler(async (request, response) => {
    const { page, limit, skip } = paginatedQuery(
      request.query as Record<string, unknown>,
    );
    const businessId = businessIdFrom(request);
    const filter: Record<string, unknown> = { businessId, isVoided: false };
    if (
      typeof request.query.from === "string" ||
      typeof request.query.to === "string"
    )
      filter.date = dateRange(request.query.from, request.query.to);
    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      Expense.countDocuments(filter),
    ]);
    response.json({
      success: true,
      message: "Expenses retrieved successfully.",
      data: expenses.map(expenseDto),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.post(
  "/expenses",
  allowRoles("owner", "manager"),
  asyncHandler(async (request, response) => {
    const input = z
      .object({
        category: z.string().trim().min(1).max(80),
        description: z.string().trim().min(1).max(500),
        amount: z.number().positive(),
        date: z.coerce.date().optional(),
        method: z.string().trim().min(1).max(40),
        reference: z.string().trim().max(100).optional(),
      })
      .strict()
      .parse(request.body);
    const expense = await Expense.create({
      ...input,
      businessId: businessIdFrom(request),
      amountMinor: toMinor(input.amount),
      recordedBy: request.auth!.userId,
    });
    await recordAudit({
      businessId: expense.businessId,
      userId: request.auth!.userId,
      action: "expense.created",
      entityType: "expense",
      entityId: expense._id,
    });
    response.status(201).json({
      success: true,
      message: "Expense recorded successfully.",
      data: expenseDto(expense),
    });
  }),
);

router.delete(
  "/expenses/:id",
  allowRoles("owner", "manager"),
  asyncHandler(async (request, response) => {
    const expense = await Expense.findOneAndUpdate(
      {
        _id: objectId(request.params.id),
        businessId: businessIdFrom(request),
        isVoided: false,
      },
      { $set: { isVoided: true } },
      { new: true },
    );
    if (!expense)
      throw new HttpError(404, "Expense not found.", "EXPENSE_NOT_FOUND");
    await recordAudit({
      businessId: expense.businessId,
      userId: request.auth!.userId,
      action: "expense.voided",
      entityType: "expense",
      entityId: expense._id,
    });
    response.json({
      success: true,
      message: "Expense voided successfully.",
      data: null,
    });
  }),
);

function dateRange(from: unknown, to: unknown) {
  const range: Record<string, Date> = {};
  if (typeof from === "string") {
    const date = new Date(from);
    if (Number.isNaN(date.getTime()))
      throw new HttpError(400, "Invalid start date.", "INVALID_DATE");
    range.$gte = date;
  }
  if (typeof to === "string") {
    const date = new Date(to);
    if (Number.isNaN(date.getTime()))
      throw new HttpError(400, "Invalid end date.", "INVALID_DATE");
    date.setUTCHours(23, 59, 59, 999);
    range.$lte = date;
  }
  return range;
}

function saleDto(sale: InstanceType<typeof Sale>) {
  const lines = sale.lines as SaleLineDocument[];
  return {
    id: sale._id.toString(),
    receipt: sale.receipt,
    customerId: sale.customerId?.toString() ?? null,
    customer: sale.customer,
    lines: lines.map((line) => ({
      productId: line.productId.toString(),
      name: line.name,
      sku: line.sku,
      quantity: line.quantity,
      unitPrice: fromMinor(line.unitPriceMinor),
    })),
    subtotal: fromMinor(sale.subtotalMinor),
    discount: fromMinor(sale.discountMinor),
    tax: fromMinor(sale.taxMinor),
    total: fromMinor(sale.totalMinor),
    amountPaid: fromMinor(sale.amountPaidMinor),
    balanceDue: fromMinor(
      Math.max(0, sale.totalMinor - sale.amountPaidMinor - sale.refundedMinor),
    ),
    paymentMethod: sale.paymentMethod,
    paymentStatus: sale.paymentStatus,
    status: sale.status,
    createdAt: sale.createdAt,
  };
}

function purchaseDto(purchase: InstanceType<typeof Purchase>) {
  return {
    id: purchase._id.toString(),
    invoice: purchase.invoice,
    supplierId: purchase.supplierId.toString(),
    supplier: purchase.supplier,
    productId: purchase.productId.toString(),
    productName: purchase.productName,
    quantity: purchase.quantity,
    unitCost: fromMinor(purchase.unitCostMinor),
    total: fromMinor(purchase.totalMinor),
    amountPaid: fromMinor(purchase.amountPaidMinor),
    status: purchase.status,
    date: purchase.date,
  };
}

function expenseDto(expense: InstanceType<typeof Expense>) {
  return {
    id: expense._id.toString(),
    category: expense.category,
    description: expense.description,
    amount: fromMinor(expense.amountMinor),
    date: expense.date,
    method: expense.method,
    reference: expense.reference,
  };
}

export default router;
