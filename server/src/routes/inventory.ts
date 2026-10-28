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
import { Product, StockMovement } from "../models";
import { recordAudit } from "../services/audit";

const router = Router();
const productInput = z
  .object({
    name: z.string().trim().min(1).max(180),
    sku: z.string().trim().min(1).max(80),
    barcode: z.string().trim().max(100).optional(),
    category: z.string().trim().max(100).default("Uncategorized"),
    brand: z.string().trim().max(100).optional(),
    description: z.string().trim().max(2000).optional(),
    unit: z.string().trim().min(1).max(40).default("Unit"),
    stock: z.number().min(0).default(0),
    reorderLevel: z.number().min(0).default(0),
    costPrice: z.number().min(0),
    sellingPrice: z.number().min(0),
  })
  .strict();
router.use(authenticate, requireBusiness);

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const { page, limit, skip } = paginatedQuery(
      request.query as Record<string, unknown>,
    );
    const filter: Record<string, unknown> = {
      businessId: businessIdFrom(request),
      isActive: true,
    };
    const search =
      typeof request.query.search === "string"
        ? request.query.search.trim()
        : "";
    if (search)
      filter.$or = [
        {
          name: {
            $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            $options: "i",
          },
        },
        {
          sku: {
            $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            $options: "i",
          },
        },
        { barcode: search },
      ];
    if (request.query.lowStock === "true")
      filter.$expr = { $lte: ["$stock", "$reorderLevel"] };
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);
    response.json({
      success: true,
      message: "Products retrieved successfully.",
      data: products.map(productDto),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const product = await Product.findOne({
      _id: objectId(request.params.id),
      businessId: businessIdFrom(request),
      isActive: true,
    });
    if (!product)
      throw new HttpError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    response.json({
      success: true,
      message: "Product retrieved successfully.",
      data: productDto(product),
    });
  }),
);

router.post(
  "/",
  allowRoles("owner", "manager", "inventory"),
  asyncHandler(async (request, response) => {
    const input = productInput.parse(request.body);
    const businessId = businessIdFrom(request);
    const transaction = await Product.startSession();
    let product: InstanceType<typeof Product> | null = null;
    try {
      await transaction.withTransaction(async () => {
        const [created] = await Product.create(
          [
            {
              ...input,
              businessId,
              costPriceMinor: toMinor(input.costPrice),
              sellingPriceMinor: toMinor(input.sellingPrice),
            },
          ],
          { session: transaction },
        );
        if (input.stock > 0) {
          await StockMovement.create(
            [
              {
                businessId,
                productId: created._id,
                movementType: "opening",
                quantityChange: input.stock,
                quantityBefore: 0,
                quantityAfter: input.stock,
                referenceType: "opening-balance",
                performedBy: request.auth!.userId,
              },
            ],
            { session: transaction },
          );
        }
        product = created;
      });
    } finally {
      await transaction.endSession();
    }
    if (!product)
      throw new HttpError(
        500,
        "Product could not be created.",
        "PRODUCT_CREATE_FAILED",
      );
    await recordAudit({
      businessId,
      userId: request.auth!.userId,
      action: "product.created",
      entityType: "product",
      entityId: product._id,
    });
    response.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: productDto(product),
    });
  }),
);

router.patch(
  "/:id",
  allowRoles("owner", "manager", "inventory"),
  asyncHandler(async (request, response) => {
    const input = productInput.partial().strict().parse(request.body);
    const updates: Record<string, unknown> = { ...input };
    if (input.costPrice !== undefined) {
      updates.costPriceMinor = toMinor(input.costPrice);
      delete updates.costPrice;
    }
    if (input.sellingPrice !== undefined) {
      updates.sellingPriceMinor = toMinor(input.sellingPrice);
      delete updates.sellingPrice;
    }
    delete updates.stock;
    const product = await Product.findOneAndUpdate(
      {
        _id: objectId(request.params.id),
        businessId: businessIdFrom(request),
        isActive: true,
      },
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!product)
      throw new HttpError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    await recordAudit({
      businessId: product.businessId,
      userId: request.auth!.userId,
      action: "product.updated",
      entityType: "product",
      entityId: product._id,
    });
    response.json({
      success: true,
      message: "Product updated successfully.",
      data: productDto(product),
    });
  }),
);

router.delete(
  "/:id",
  allowRoles("owner", "manager"),
  asyncHandler(async (request, response) => {
    const product = await Product.findOneAndUpdate(
      {
        _id: objectId(request.params.id),
        businessId: businessIdFrom(request),
        isActive: true,
      },
      { $set: { isActive: false } },
      { new: true },
    );
    if (!product)
      throw new HttpError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    await recordAudit({
      businessId: product.businessId,
      userId: request.auth!.userId,
      action: "product.archived",
      entityType: "product",
      entityId: product._id,
    });
    response.json({
      success: true,
      message: "Product archived successfully.",
      data: null,
    });
  }),
);

router.post(
  "/:id/adjustments",
  allowRoles("owner", "manager", "inventory"),
  asyncHandler(async (request, response) => {
    const input = z
      .object({
        quantityChange: z.number().refine((value) => value !== 0),
        reason: z.string().trim().min(3).max(300),
      })
      .strict()
      .parse(request.body);
    const businessId = businessIdFrom(request);
    const session = await Product.startSession();
    let movement: InstanceType<typeof StockMovement> | null = null;
    try {
      await session.withTransaction(async () => {
        const product = await Product.findOne({
          _id: objectId(request.params.id),
          businessId,
          isActive: true,
        }).session(session);
        if (!product)
          throw new HttpError(404, "Product not found.", "PRODUCT_NOT_FOUND");
        const before = product.stock;
        const after = before + input.quantityChange;
        if (after < 0)
          throw new HttpError(
            422,
            "Stock cannot become negative.",
            "INSUFFICIENT_STOCK",
          );
        product.stock = after;
        await product.save({ session });
        const [created] = await StockMovement.create(
          [
            {
              businessId,
              productId: product._id,
              movementType: "adjustment",
              quantityChange: input.quantityChange,
              quantityBefore: before,
              quantityAfter: after,
              reason: input.reason,
              performedBy: request.auth!.userId,
            },
          ],
          { session },
        );
        movement = created;
      });
    } finally {
      await session.endSession();
    }
    response.status(201).json({
      success: true,
      message: "Stock adjustment recorded.",
      data: movement,
    });
  }),
);

router.get(
  "/:id/movements",
  asyncHandler(async (request, response) => {
    const productId = objectId(request.params.id);
    const businessId = businessIdFrom(request);
    const product = await Product.exists({ _id: productId, businessId });
    if (!product)
      throw new HttpError(404, "Product not found.", "PRODUCT_NOT_FOUND");
    const movements = await StockMovement.find({ productId, businessId })
      .sort({ createdAt: -1 })
      .limit(100);
    response.json({
      success: true,
      message: "Stock movements retrieved successfully.",
      data: movements,
    });
  }),
);

function productDto(product: InstanceType<typeof Product>) {
  return {
    id: product._id.toString(),
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    category: product.category,
    brand: product.brand,
    description: product.description,
    unit: product.unit,
    stock: product.stock,
    reorderLevel: product.reorderLevel,
    costPrice: fromMinor(product.costPriceMinor),
    sellingPrice: fromMinor(product.sellingPriceMinor),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export default router;
