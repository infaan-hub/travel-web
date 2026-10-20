import "server-only";
import { ApiError } from "@/lib/api/http";
import prisma from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { RegisterInput } from "@/lib/validation/schemas";

export async function registerUser(input: RegisterInput) {
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    throw new ApiError(400, "A user with that username already exists.", {
      username: ["A user with that username already exists."],
    });
  }
  const existingEmail = await prisma.user.findFirst({ where: { email } });
  if (existingEmail) {
    throw new ApiError(400, "A user with that email already exists.", {
      email: ["A user with that email already exists."],
    });
  }

  const password = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      username,
      email,
      password,
      firstName: input.first_name ?? "",
      lastName: input.last_name ?? "",
      profile: { create: {} },
    },
  });
}

export type AuthenticatedUser = {
  id: number;
  username: string;
  email: string;
  isStaff: boolean;
  isSuperuser: boolean;
  isActive: boolean;
};

export async function authenticateUser(
  username: string,
  password: string,
): Promise<AuthenticatedUser> {
  const user = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid username or password.");
  }

  const check = await verifyPassword(password, user.password);
  if (!check.valid) {
    throw new ApiError(401, "Invalid username or password.");
  }

  const data: Record<string, unknown> = { lastLogin: new Date() };
  if (check.needsUpgrade) {
    data.password = await hashPassword(password);
  }
  const updated = await prisma.user.update({ where: { id: user.id }, data });

  return {
    id: updated.id,
    username: updated.username,
    email: updated.email,
    isStaff: updated.isStaff,
    isSuperuser: updated.isSuperuser,
    isActive: updated.isActive,
  };
}

export async function createStaffUser(input: {
  username: string;
  email: string;
  password: string;
}) {
  const password = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      username: input.username,
      email: input.email.toLowerCase(),
      password,
      isStaff: true,
      profile: { create: {} },
    },
  });
}
