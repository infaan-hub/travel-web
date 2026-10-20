import { describe, expect, it } from "vitest";
import { signAccessToken, signRefreshToken, verifyToken } from "@/lib/auth/tokens";

describe("JWT tokens", () => {
  it("round-trips an access token", async () => {
    const token = await signAccessToken({ id: 7, username: "admin", isStaff: true });
    const payload = await verifyToken(token, "access");
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("7");
    expect(payload?.staff).toBe(true);
  });

  it("does not accept a refresh token as an access token", async () => {
    const refresh = await signRefreshToken({ id: 7, username: "admin", isStaff: true });
    expect(await verifyToken(refresh, "access")).toBeNull();
    expect(await verifyToken(refresh, "refresh")).not.toBeNull();
  });

  it("rejects tampered tokens", async () => {
    const token = await signAccessToken({ id: 7, username: "admin", isStaff: false });
    const parts = token.split(".");
    parts[1] = `${parts[1].slice(0, -2)}xx`;
    expect(await verifyToken(parts.join("."), "access")).toBeNull();
  });
});
