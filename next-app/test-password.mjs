import { PrismaClient } from "@prisma/client";
import { verify } from "@node-rs/argon2";

const p = new PrismaClient();
const admin = await p.user.findUnique({ where: { username: "admin" }, select: { id: true, password: true } });
const isValid = await verify(admin.password, "admin123");
console.log("password valid:", isValid);
await p.$disconnect();