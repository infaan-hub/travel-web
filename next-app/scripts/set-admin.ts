import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import prisma from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { registerSchema } from "../src/lib/validation/schemas";

/**
 * Create or reset an administrator account.
 *
 * Unlike create-admin.ts this also resets the password of an existing account,
 * which is what a production deployment needs after a database restore.
 *
 * Supply ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD in the environment,
 * or enter them at the prompts. This script will not create a second admin.
 */
async function main() {
  const interactive = !process.env.ADMIN_USERNAME || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD;
  const rl = interactive ? createInterface({ input, output }) : null;

  const username = process.env.ADMIN_USERNAME || (await rl!.question("Admin username: ")).trim();
  const email = process.env.ADMIN_EMAIL || (await rl!.question("Admin email: ")).trim();
  const password = process.env.ADMIN_PASSWORD || (await rl!.question("Admin password (min 8): ")).trim();
  rl?.close();

  const parsed = registerSchema.parse({ username, email, password });
  const hashed = await hashPassword(parsed.password);

  const existing = await prisma.user.findUnique({ where: { username: parsed.username } });
  const existingStaff = await prisma.user.findFirst({
    where: { isStaff: true },
    select: { id: true, username: true },
  });
  if (existingStaff && existingStaff.id !== existing?.id) {
    throw new Error(
      `Administrator "${existingStaff.username}" already exists. Only one administrator account is supported.`,
    );
  }

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        email: parsed.email.toLowerCase(),
        password: hashed,
        isStaff: true,
        isActive: true,
        deletedAt: null,
        sessionVersion: { increment: 1 },
      },
    });
    console.log(`Updated administrator "${parsed.username}" (id ${existing.id}).`);
  } else {
    const created = await prisma.user.create({
      data: {
        username: parsed.username,
        email: parsed.email.toLowerCase(),
        password: hashed,
        isStaff: true,
        isSuperuser: true,
        profile: { create: {} },
      },
    });
    console.log(`Created administrator "${created.username}" (id ${created.id}).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
