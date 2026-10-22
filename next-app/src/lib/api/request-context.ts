import type { AuthUser } from "@/lib/auth/session";

/**
 * Request metadata for audit rows. Forwarded headers are only trusted at the
 * edge/proxy boundary; audit logging never uses them for authorization.
 */
export function requestAuditActor(request: Request, user: Pick<AuthUser, "id">) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress =
    forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  return {
    id: user.id,
    ipAddress,
    userAgent: request.headers.get("user-agent"),
  };
}
