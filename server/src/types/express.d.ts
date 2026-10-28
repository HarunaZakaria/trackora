import type { Types } from "mongoose";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: Types.ObjectId;
        businessId: Types.ObjectId | null;
        membershipId: Types.ObjectId | null;
        role: string;
        platformRole: "user" | "super-admin";
        sessionId: Types.ObjectId;
      };
    }
  }
}

export {};
