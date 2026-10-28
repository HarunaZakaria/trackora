import { Router } from "express";
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
import { Customer, Payment, Sale, Supplier } from "../models";
import { recordAudit } from "../services/audit";

const router = Router();
router.use(authenticate, requireBusiness);

const customerInput = z
  .object({
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().max(40).default(""),
    email: z.string().trim().email().or(z.literal("")).default(""),
    address: z.string().trim().max(300).default(""),
    creditLimit: z.number().min(0).default(0),
  })
  .strict();
const supplierInput = z
  .object({
    name: z.string().trim().min(1).max(160),
    contact: z.string().trim().max(120).default(""),
    phone: z.string().trim().max(40).default(""),
    email: z.string().trim().email().or(z.literal("")).default(""),
    address: z.string().trim().max(300).default(""),
  })
  .strict();

router.get(
  "/customers",
  asyncHandler(async (request, response) => {
    const { page, limit, skip } = paginatedQuery(
      request.query as Record<string, unknown>,
    );
    const businessId = businessIdFrom(request);
    const filter = { businessId, isActive: true };
    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Customer.countDocuments(filter),
    ]);
    response.json({
      success: true,
      message: "Customers retrieved successfully.",
      data: customers.map(customerDto),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.post(
  "/customers",
  allowRoles("owner", "manager", "cashier"),
  asyncHandler(async (request, response) => {
    const input = customerInput.parse(request.body);
    const customer = await Customer.create({
      ...input,
      businessId: businessIdFrom(request),
      creditLimitMinor: toMinor(input.creditLimit),
    });
    await recordAudit({
      businessId: customer.businessId,
      userId: request.auth!.userId,
      action: "customer.created",
      entityType: "customer",
      entityId: customer._id,
    });
    response.status(201).json({
      success: true,
      message: "Customer created successfully.",
      data: customerDto(customer),
    });
  }),
);

router.get(
  "/customers/:id",
  asyncHandler(async (request, response) => {
    const customer = await Customer.findOne({
      _id: objectId(request.params.id),
      businessId: businessIdFrom(request),
      isActive: true,
    });
    if (!customer)
      throw new HttpError(404, "Customer not found.", "CUSTOMER_NOT_FOUND");
    response.json({
      success: true,
      message: "Customer retrieved successfully.",
      data: customerDto(customer),
    });
  }),
);

router.patch(
  "/customers/:id",
  allowRoles("owner", "manager"),
  asyncHandler(async (request, response) => {
    const input = customerInput.partial().strict().parse(request.body);
    const updates: Record<string, unknown> = { ...input };
    if (input.creditLimit !== undefined) {
      updates.creditLimitMinor = toMinor(input.creditLimit);
      delete updates.creditLimit;
    }
    const customer = await Customer.findOneAndUpdate(
      {
        _id: objectId(request.params.id),
        businessId: businessIdFrom(request),
        isActive: true,
      },
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!customer)
      throw new HttpError(404, "Customer not found.", "CUSTOMER_NOT_FOUND");
    response.json({
      success: true,
      message: "Customer updated successfully.",
      data: customerDto(customer),
    });
  }),
);

router.delete(
  "/customers/:id",
  allowRoles("owner", "manager"),
  asyncHandler(async (request, response) => {
    const customer = await Customer.findOne({
      _id: objectId(request.params.id),
      businessId: businessIdFrom(request),
      isActive: true,
    });
    if (!customer)
      throw new HttpError(404, "Customer not found.", "CUSTOMER_NOT_FOUND");
    if (customer.balanceMinor > 0) {
      throw new HttpError(
        409,
        "Customers with an outstanding balance cannot be archived.",
        "CUSTOMER_HAS_BALANCE",
      );
    }
    customer.isActive = false;
    await customer.save();
    await recordAudit({
      businessId: customer.businessId,
      userId: request.auth!.userId,
      action: "customer.archived",
      entityType: "customer",
      entityId: customer._id,
    });
    response.json({
      success: true,
      message: "Customer archived successfully.",
      data: null,
    });
  }),
);

router.get(
  "/customers/:id/transactions",
  asyncHandler(async (request, response) => {
    const customerId = objectId(request.params.id);
    const businessId = businessIdFrom(request);
    const customer = await Customer.exists({
      _id: customerId,
      businessId,
      isActive: true,
    });
    if (!customer)
      throw new HttpError(404, "Customer not found.", "CUSTOMER_NOT_FOUND");
    const [sales, payments] = await Promise.all([
      Sale.find({ businessId, customerId }).sort({ createdAt: -1 }).limit(100),
      Payment.find({
        businessId,
        customerId,
        type: "customer",
        status: "completed",
      })
        .sort({ paidAt: -1 })
        .limit(100),
    ]);
    response.json({
      success: true,
      message: "Customer transactions retrieved successfully.",
      data: { sales, payments: payments.map(paymentDto) },
    });
  }),
);

router.post(
  "/customers/:id/payments",
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
    const customerId = objectId(request.params.id);
    const amountMinor = toMinor(input.amount);
    const session = await Customer.startSession();
    let payment: InstanceType<typeof Payment> | null = null;
    try {
      await session.withTransaction(async () => {
        const customer = await Customer.findOne({
          _id: customerId,
          businessId,
          isActive: true,
        }).session(session);
        if (!customer)
          throw new HttpError(404, "Customer not found.", "CUSTOMER_NOT_FOUND");
        if (amountMinor > customer.balanceMinor)
          throw new HttpError(
            422,
            "Payment exceeds the customer's outstanding balance.",
            "PAYMENT_EXCEEDS_BALANCE",
          );
        customer.balanceMinor -= amountMinor;
        await customer.save({ session });
        const [created] = await Payment.create(
          [
            {
              businessId,
              customerId,
              type: "customer",
              amountMinor,
              method: input.method,
              reference: input.reference,
              receivedBy: request.auth!.userId,
            },
          ],
          { session },
        );
        payment = created;
      });
    } finally {
      await session.endSession();
    }
    response.status(201).json({
      success: true,
      message: "Customer payment recorded.",
      data: payment ? paymentDto(payment) : null,
    });
  }),
);

router.get(
  "/suppliers",
  asyncHandler(async (request, response) => {
    const { page, limit, skip } = paginatedQuery(
      request.query as Record<string, unknown>,
    );
    const businessId = businessIdFrom(request);
    const filter = { businessId, isActive: true };
    const [suppliers, total] = await Promise.all([
      Supplier.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Supplier.countDocuments(filter),
    ]);
    response.json({
      success: true,
      message: "Suppliers retrieved successfully.",
      data: suppliers.map(supplierDto),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.post(
  "/suppliers",
  allowRoles("owner", "manager", "inventory"),
  asyncHandler(async (request, response) => {
    const input = supplierInput.parse(request.body);
    const supplier = await Supplier.create({
      ...input,
      businessId: businessIdFrom(request),
    });
    await recordAudit({
      businessId: supplier.businessId,
      userId: request.auth!.userId,
      action: "supplier.created",
      entityType: "supplier",
      entityId: supplier._id,
    });
    response.status(201).json({
      success: true,
      message: "Supplier created successfully.",
      data: supplierDto(supplier),
    });
  }),
);

router.get(
  "/suppliers/:id",
  asyncHandler(async (request, response) => {
    const supplier = await Supplier.findOne({
      _id: objectId(request.params.id),
      businessId: businessIdFrom(request),
      isActive: true,
    });
    if (!supplier)
      throw new HttpError(404, "Supplier not found.", "SUPPLIER_NOT_FOUND");
    response.json({
      success: true,
      message: "Supplier retrieved successfully.",
      data: supplierDto(supplier),
    });
  }),
);

router.patch(
  "/suppliers/:id",
  allowRoles("owner", "manager"),
  asyncHandler(async (request, response) => {
    const updates = supplierInput.partial().strict().parse(request.body);
    const supplier = await Supplier.findOneAndUpdate(
      {
        _id: objectId(request.params.id),
        businessId: businessIdFrom(request),
        isActive: true,
      },
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!supplier)
      throw new HttpError(404, "Supplier not found.", "SUPPLIER_NOT_FOUND");
    response.json({
      success: true,
      message: "Supplier updated successfully.",
      data: supplierDto(supplier),
    });
  }),
);

router.delete(
  "/suppliers/:id",
  allowRoles("owner", "manager"),
  asyncHandler(async (request, response) => {
    const supplier = await Supplier.findOne({
      _id: objectId(request.params.id),
      businessId: businessIdFrom(request),
      isActive: true,
    });
    if (!supplier)
      throw new HttpError(404, "Supplier not found.", "SUPPLIER_NOT_FOUND");
    if (supplier.balanceMinor > 0) {
      throw new HttpError(
        409,
        "Suppliers with an outstanding balance cannot be archived.",
        "SUPPLIER_HAS_BALANCE",
      );
    }
    supplier.isActive = false;
    await supplier.save();
    await recordAudit({
      businessId: supplier.businessId,
      userId: request.auth!.userId,
      action: "supplier.archived",
      entityType: "supplier",
      entityId: supplier._id,
    });
    response.json({
      success: true,
      message: "Supplier archived successfully.",
      data: null,
    });
  }),
);

router.post(
  "/suppliers/:id/payments",
  allowRoles("owner", "manager"),
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
    const supplierId = objectId(request.params.id);
    const amountMinor = toMinor(input.amount);
    const session = await Supplier.startSession();
    let payment: InstanceType<typeof Payment> | null = null;
    try {
      await session.withTransaction(async () => {
        const supplier = await Supplier.findOne({
          _id: supplierId,
          businessId,
          isActive: true,
        }).session(session);
        if (!supplier)
          throw new HttpError(404, "Supplier not found.", "SUPPLIER_NOT_FOUND");
        if (amountMinor > supplier.balanceMinor)
          throw new HttpError(
            422,
            "Payment exceeds the supplier balance.",
            "PAYMENT_EXCEEDS_BALANCE",
          );
        supplier.balanceMinor -= amountMinor;
        await supplier.save({ session });
        const [created] = await Payment.create(
          [
            {
              businessId,
              supplierId,
              type: "supplier",
              amountMinor,
              method: input.method,
              reference: input.reference,
              receivedBy: request.auth!.userId,
            },
          ],
          { session },
        );
        payment = created;
      });
    } finally {
      await session.endSession();
    }
    response.status(201).json({
      success: true,
      message: "Supplier payment recorded.",
      data: payment ? paymentDto(payment) : null,
    });
  }),
);

function customerDto(customer: InstanceType<typeof Customer>) {
  return {
    id: customer._id.toString(),
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    creditLimit: fromMinor(customer.creditLimitMinor),
    balance: fromMinor(customer.balanceMinor),
  };
}

function supplierDto(supplier: InstanceType<typeof Supplier>) {
  return {
    id: supplier._id.toString(),
    name: supplier.name,
    contact: supplier.contact,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    balance: fromMinor(supplier.balanceMinor),
  };
}

function paymentDto(payment: InstanceType<typeof Payment>) {
  return {
    id: payment._id.toString(),
    amount: fromMinor(payment.amountMinor),
    method: payment.method,
    reference: payment.reference,
    type: payment.type,
    paidAt: payment.paidAt,
  };
}

export default router;
