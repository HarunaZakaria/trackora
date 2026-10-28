import { AuditLog } from "../models";

export async function recordAudit(input: {
  businessId?: unknown;
  userId?: unknown;
  action: string;
  entityType: string;
  entityId?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await AuditLog.create({ ...input, metadata: input.metadata ?? {} });
}
