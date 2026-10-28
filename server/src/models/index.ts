import { model, models, Schema, type Model } from "mongoose";

const objectId = Schema.Types.ObjectId;
const moneyMinor = { type: Number, min: 0, required: true };

const businessSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    businessType: { type: String, default: "retail", trim: true },
    ownerId: { type: objectId, ref: "User", required: true },
    currency: { type: String, required: true, default: "GHS", uppercase: true },
    contactDetails: { phone: String, email: String },
    address: String,
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
    preferences: {
      lowStockAlerts: { type: Boolean, default: true },
      receiptNumbering: { type: Boolean, default: true },
      supplierReminders: { type: Boolean, default: false },
      darkMode: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
    platformRole: {
      type: String,
      enum: ["user", "super-admin"],
      default: "user",
      index: true,
    },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

const membershipSchema = new Schema(
  {
    businessId: {
      type: objectId,
      ref: "Business",
      required: true,
      index: true,
    },
    userId: { type: objectId, ref: "User", required: true, index: true },
    role: {
      type: String,
      enum: ["owner", "manager", "cashier", "inventory"],
      default: "owner",
    },
    permissions: { type: [String], default: [] },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
  },
  { timestamps: true },
);
membershipSchema.index({ businessId: 1, userId: 1 }, { unique: true });

const authSessionSchema = new Schema(
  {
    userId: { type: objectId, ref: "User", required: true, index: true },
    businessId: { type: objectId, ref: "Business", default: null, index: true },
    membershipId: { type: objectId, ref: "Membership", default: null },
    refreshTokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: Date,
    lastUsedAt: Date,
  },
  { timestamps: true },
);

const passwordResetSchema = new Schema(
  {
    userId: { type: objectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: Date,
  },
  { timestamps: true },
);

const productSchema = new Schema(
  {
    businessId: {
      type: objectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 180 },
    sku: { type: String, required: true, trim: true, uppercase: true },
    barcode: { type: String, trim: true },
    category: { type: String, trim: true, default: "Uncategorized" },
    brand: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 2000 },
    unit: { type: String, required: true, trim: true, default: "Unit" },
    stock: { type: Number, min: 0, default: 0 },
    reorderLevel: { type: Number, min: 0, default: 0 },
    costPriceMinor: moneyMinor,
    sellingPriceMinor: moneyMinor,
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);
productSchema.index({ businessId: 1, sku: 1 }, { unique: true });
productSchema.index({
  businessId: 1,
  name: "text",
  sku: "text",
  barcode: "text",
});

const customerSchema = new Schema(
  {
    businessId: {
      type: objectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },
    creditLimitMinor: { type: Number, min: 0, default: 0 },
    balanceMinor: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);
customerSchema.index({ businessId: 1, name: 1 });

const supplierSchema = new Schema(
  {
    businessId: {
      type: objectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    contact: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },
    balanceMinor: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);
supplierSchema.index({ businessId: 1, name: 1 });

const saleLineSchema = new Schema(
  {
    productId: { type: objectId, ref: "Product", required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, min: 0.001, required: true },
    unitPriceMinor: { ...moneyMinor },
    unitCostMinor: { ...moneyMinor },
    returnedQuantity: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const saleSchema = new Schema(
  {
    businessId: {
      type: objectId,
      ref: "Business",
      required: true,
      index: true,
    },
    receipt: { type: String, required: true },
    customerId: { type: objectId, ref: "Customer", default: null },
    customer: { type: String, required: true, default: "Walk-in customer" },
    cashierId: { type: objectId, ref: "User", required: true },
    lines: { type: [saleLineSchema], required: true },
    subtotalMinor: { ...moneyMinor },
    discountMinor: { ...moneyMinor, default: 0 },
    taxMinor: { ...moneyMinor, default: 0 },
    totalMinor: { ...moneyMinor },
    amountPaidMinor: { ...moneyMinor, default: 0 },
    refundedMinor: { ...moneyMinor, default: 0 },
    status: {
      type: String,
      enum: ["completed", "partially-refunded", "refunded", "voided"],
      default: "completed",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "partially-paid",
        "paid",
        "partially-refunded",
        "refunded",
      ],
      required: true,
    },
    paymentMethod: { type: String, required: true },
  },
  { timestamps: true },
);
saleSchema.index({ businessId: 1, receipt: 1 }, { unique: true });
saleSchema.index({ businessId: 1, createdAt: -1 });

const paymentSchema = new Schema(
  {
    businessId: {
      type: objectId,
      ref: "Business",
      required: true,
      index: true,
    },
    saleId: { type: objectId, ref: "Sale", default: null, index: true },
    customerId: { type: objectId, ref: "Customer", default: null },
    supplierId: { type: objectId, ref: "Supplier", default: null },
    type: {
      type: String,
      enum: ["sale", "customer", "supplier", "refund"],
      required: true,
    },
    amountMinor: { ...moneyMinor },
    method: { type: String, required: true, trim: true },
    reference: { type: String, trim: true },
    status: {
      type: String,
      enum: ["completed", "voided"],
      default: "completed",
    },
    receivedBy: { type: objectId, ref: "User", required: true },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const purchaseSchema = new Schema(
  {
    businessId: {
      type: objectId,
      ref: "Business",
      required: true,
      index: true,
    },
    invoice: { type: String, required: true },
    supplierId: { type: objectId, ref: "Supplier", required: true },
    supplier: { type: String, required: true },
    productId: { type: objectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, min: 0.001, required: true },
    unitCostMinor: { ...moneyMinor },
    totalMinor: { ...moneyMinor },
    amountPaidMinor: { ...moneyMinor, default: 0 },
    status: {
      type: String,
      enum: ["Pending", "Received", "Cancelled"],
      default: "Pending",
      index: true,
    },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
purchaseSchema.index({ businessId: 1, invoice: 1 }, { unique: true });

const expenseSchema = new Schema(
  {
    businessId: {
      type: objectId,
      ref: "Business",
      required: true,
      index: true,
    },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    amountMinor: { ...moneyMinor },
    date: { type: Date, required: true, default: Date.now },
    method: { type: String, required: true, trim: true },
    reference: { type: String, trim: true },
    recordedBy: { type: objectId, ref: "User", required: true },
    isVoided: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);
expenseSchema.index({ businessId: 1, date: -1 });

const stockMovementSchema = new Schema(
  {
    businessId: {
      type: objectId,
      ref: "Business",
      required: true,
      index: true,
    },
    productId: { type: objectId, ref: "Product", required: true, index: true },
    movementType: {
      type: String,
      enum: ["purchase", "sale", "return", "adjustment", "damage", "opening"],
      required: true,
    },
    quantityChange: { type: Number, required: true },
    quantityBefore: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    referenceType: { type: String, default: "manual" },
    referenceId: { type: objectId },
    reason: { type: String, trim: true },
    performedBy: { type: objectId, ref: "User", required: true },
  },
  { timestamps: true },
);
stockMovementSchema.index({ businessId: 1, productId: 1, createdAt: -1 });

const auditLogSchema = new Schema(
  {
    businessId: { type: objectId, ref: "Business", default: null, index: true },
    userId: { type: objectId, ref: "User", default: null, index: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: objectId },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: String,
  },
  { timestamps: true },
);

const returnSchema = new Schema(
  {
    businessId: {
      type: objectId,
      ref: "Business",
      required: true,
      index: true,
    },
    saleId: { type: objectId, ref: "Sale", required: true, index: true },
    receipt: { type: String, required: true },
    items: [
      {
        productId: objectId,
        name: String,
        quantity: Number,
        amountMinor: Number,
      },
    ],
    totalMinor: { ...moneyMinor },
    reason: { type: String, required: true, trim: true },
    restock: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["completed", "voided"],
      default: "completed",
    },
    processedBy: { type: objectId, ref: "User", required: true },
  },
  { timestamps: true },
);

const receiptCounterSchema = new Schema(
  {
    businessId: { type: objectId, ref: "Business", required: true },
    sequence: { type: Number, default: 1000, min: 1000 },
  },
  { timestamps: true },
);
receiptCounterSchema.index({ businessId: 1 }, { unique: true });

function existingOrCreate(name: string, schema: Schema): Model<any> {
  return (models[name] as Model<any> | undefined) ?? model(name, schema);
}

export const Business = existingOrCreate("Business", businessSchema);
export const User = existingOrCreate("User", userSchema);
export const Membership = existingOrCreate("Membership", membershipSchema);
export const AuthSession = existingOrCreate("AuthSession", authSessionSchema);
export const PasswordReset = existingOrCreate(
  "PasswordReset",
  passwordResetSchema,
);
export const Product = existingOrCreate("Product", productSchema);
export const Customer = existingOrCreate("Customer", customerSchema);
export const Supplier = existingOrCreate("Supplier", supplierSchema);
export const Sale = existingOrCreate("Sale", saleSchema);
export const Payment = existingOrCreate("Payment", paymentSchema);
export const Purchase = existingOrCreate("Purchase", purchaseSchema);
export const Expense = existingOrCreate("Expense", expenseSchema);
export const StockMovement = existingOrCreate(
  "StockMovement",
  stockMovementSchema,
);
export const AuditLog = existingOrCreate("AuditLog", auditLogSchema);
export const SalesReturn = existingOrCreate("SalesReturn", returnSchema);
export const ReceiptCounter = existingOrCreate(
  "ReceiptCounter",
  receiptCounterSchema,
);

export type IdInput = string | import("mongoose").Types.ObjectId;
