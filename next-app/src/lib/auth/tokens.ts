import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/env";

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24; // 1 day
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type TokenType = "access" | "refresh";

export type AuthTokenPayload = JWTPayload & {
  sub: string;
  username: string;
  staff: boolean;
  type: TokenType;
  /** Session version; a mismatch invalidates the token. */
  ver?: number;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env().AUTH_SECRET);
}

export async function signToken(
  payload: {
    id: number;
    username: string;
    staff: boolean;
    type: TokenType;
    version?: number;
  },
  ttlSeconds: number,
): Promise<string> {
  return new SignJWT({
    username: payload.username,
    staff: payload.staff,
    type: payload.type,
    ver: payload.version ?? 1,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.id))
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey());
}

export async function signAccessToken(user: {
  id: number;
  username: string;
  isStaff: boolean;
  sessionVersion?: number;
}): Promise<string> {
  return signToken(
    {
      id: user.id,
      username: user.username,
      staff: user.isStaff,
      type: "access",
      version: user.sessionVersion ?? 1,
    },
    ACCESS_TOKEN_TTL_SECONDS,
  );
}

export async function signRefreshToken(user: {
  id: number;
  username: string;
  isStaff: boolean;
  sessionVersion?: number;
}): Promise<string> {
  return signToken(
    {
      id: user.id,
      username: user.username,
      staff: user.isStaff,
      type: "refresh",
      version: user.sessionVersion ?? 1,
    },
    REFRESH_TOKEN_TTL_SECONDS,
  );
}

export async function verifyToken(
  token: string,
  expectedType: TokenType,
): Promise<AuthTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.type !== expectedType || typeof payload.sub !== "string") return null;
    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}
