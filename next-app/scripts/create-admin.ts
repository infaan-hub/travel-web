import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import prisma from "../src/lib/db/prisma";
import { hashPassword } from "../src/lib/auth/password";
import { registerSchema } from "../src/lib/validation/schemas";

async function main() {
  const rl = createInterface({ input, output });
  const username = process.env.ADMIN_USERNAME || (await rl.question("Admin username: ")).trim();
  const email = process.env.ADMIN_EMAIL || (await rl.question("Admin email: ")).trim();
  const password = process.env.ADMIN_PASSWORD || (await rl.question("Admin password (min 8): ")).trim();
  rl.close();

  const parsed = registerSchema.parse({ username, email, password });
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
    if (!existing.isStaff) {
      await prisma.user.update({ where: { id: existing.id }, data: { isStaff: true } });
      console.log(`Promoted existing user "${parsed.username}" to staff.`);
    } else {
      console.log(`User "${parsed.username}" is already staff.`);
    }
    return;
  }

  const created = await prisma.user.create({
    data: {
      username: parsed.username,
      email: parsed.email.toLowerCase(),
      password: await hashPassword(parsed.password),
      isStaff: true,
      profile: { create: {} },
    },
  });
  console.log(`Created administrator #${created.id} (${created.username}).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
