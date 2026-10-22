import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const p = new PrismaClient();
const password = await hash("TestPass123!", { memoryCost: 19456, timeCost: 2, parallelism: 1 });
await p.user.update({
  where: { username: "admin" },
  data: { password }
});
console.log("Admin password updated to TestPass123!");
await p.$disconnect();