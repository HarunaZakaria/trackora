import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/async-handler";
import { HttpError } from "../lib/errors";
import { businessIdFrom } from "../lib/tenant";
import { authenticate, requireBusiness } from "../middleware/authenticate";
import { allowRoles } from "../middleware/authorize";
import { AuthSession, Business, Membership, User } from "../models";
import { recordAudit } from "../services/audit";

const router = Router();
router.use(authenticate, requireBusiness);

router.get(
  "/",
  asyncHandler(async (request, response) => {
    const business = await Business.findById(businessIdFrom(request));
    response.json({
      success: true,
      message: "Business retrieved successfully.",
      data: business,
    });
  }),
);

router.patch(
  "/",
  allowRoles("owner", "manager"),
  asyncHandler(async (request, response) => {
    const input = z
      .object({
        name: z.string().trim().min(2).max(120).optional(),
        currency: z.string().length(3).optional(),
        businessType: z.string().trim().max(80).optional(),
        address: z.string().trim().max(300).optional(),
        contactDetails: z
          .object({
            phone: z.string().max(40).optional(),
            email: z.string().email().optional(),
          })
          .optional(),
        preferences: z
          .object({
            lowStockAlerts: z.boolean().optional(),
            receiptNumbering: z.boolean().optional(),
            supplierReminders: z.boolean().optional(),
            darkMode: z.boolean().optional(),
          })
          .optional(),
      })
      .strict()
      .parse(request.body);
    const business = await Business.findOneAndUpdate(
      { _id: businessIdFrom(request), status: "active" },
      { $set: input },
      { new: true, runValidators: true },
    );
    if (!business)
      throw new HttpError(404, "Business not found.", "BUSINESS_NOT_FOUND");
    await recordAudit({
      businessId: business._id,
      userId: request.auth!.userId,
      action: "business.updated",
      entityType: "business",
      entityId: business._id,
    });
    response.json({
      success: true,
      message: "Business settings updated.",
      data: business,
    });
  }),
);

router.get(
  "/members",
  allowRoles("owner", "manager"),
  asyncHandler(async (request, response) => {
    const businessId = businessIdFrom(request);
    const memberships = await Membership.find({
      businessId,
      status: "active",
    }).sort({ createdAt: 1 });
    const users = await User.find({
      _id: { $in: memberships.map((membership) => membership.userId) },
    }).select("name email status");
    const byId = new Map(users.map((user) => [user._id.toString(), user]));
    response.json({
      success: true,
      message: "Business members retrieved successfully.",
      data: memberships.map((membership) => ({
        membership,
        user: byId.get(membership.userId.toString()),
      })),
    });
  }),
);

router.post(
  "/members",
  allowRoles("owner"),
  asyncHandler(async (request, response) => {
    const input = z
      .object({
        email: z.string().email(),
        role: z.enum(["manager", "cashier", "inventory"]).default("cashier"),
      })
      .strict()
      .parse(request.body);
    const user = await User.findOne({
      email: input.email.toLowerCase(),
      status: "active",
    });
    if (!user) {
      throw new HttpError(
        404,
        "An active Stockora user with this email must register before being added.",
        "USER_NOT_FOUND",
      );
    }
    const membership = await Membership.create({
      businessId: businessIdFrom(request),
      userId: user._id,
      role: input.role,
    });
    await recordAudit({
      businessId: membership.businessId,
      userId: request.auth!.userId,
      action: "membership.created",
      entityType: "membership",
      entityId: membership._id,
      metadata: { role: input.role },
    });
    response.status(201).json({
      success: true,
      message: "Business member added successfully.",
      data: {
        membership,
        user: { id: user._id.toString(), name: user.name, email: user.email },
      },
    });
  }),
);

router.delete(
  "/members/:id",
  allowRoles("owner"),
  asyncHandler(async (request, response) => {
    const membership = await Membership.findOneAndUpdate(
      {
        _id: request.params.id,
        businessId: businessIdFrom(request),
        status: "active",
        role: { $ne: "owner" },
      },
      { $set: { status: "revoked" } },
      { new: true },
    );
    if (!membership)
      throw new HttpError(404, "Membership not found.", "MEMBERSHIP_NOT_FOUND");
    await AuthSession.updateMany(
      { membershipId: membership._id, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    await recordAudit({
      businessId: membership.businessId,
      userId: request.auth!.userId,
      action: "membership.revoked",
      entityType: "membership",
      entityId: membership._id,
    });
    response.json({
      success: true,
      message: "Business membership revoked.",
      data: null,
    });
  }),
);

export default router;
