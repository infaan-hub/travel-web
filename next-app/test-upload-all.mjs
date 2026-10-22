import { PrismaClient } from "@prisma/client";
import fs from "fs";

const p = new PrismaClient();

const loginRes = await fetch("http://localhost:3000/api/token/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "TestPass123!" })
});

console.log("Login status:", loginRes.status);
const loginData = await loginRes.json();

const cookies = loginRes.headers.getSetCookie();
const cookie = cookies.find(c => c.startsWith("infaan_session"));
const sessionCookie = cookie ? cookie.split(";")[0] : null;

if (!sessionCookie) {
  console.log("No session cookie found");
  process.exit(1);
}

console.log("Login successful");

// Upload actual images
const files = [
  { field: "more_experiences_image_1", path: "public/uploads/home/mohammed_habib_SKzgyFW.jpg" },
  { field: "more_experiences_image_2", path: "public/uploads/home/Definitely_add_this_to_your__must_do__list_when_you_come_visit_us_here_at_The_Sands_2kJDxfE.jpg" },
  { field: "more_experiences_image_3", path: "public/uploads/home/IMG-20250730-WA0031.jpg" },
  { field: "more_experiences_image_4", path: "public/uploads/home/Sunset_at_Serengeti_National_Park_in_Tanzania__1.jpg" },
  { field: "more_experiences_image_5", path: "public/uploads/home/Zanzibar_trip.jpg" },
];

const formData = new FormData();
for (const { field, path } of files) {
  const buffer = fs.readFileSync(path);
  const file = new File([new Uint8Array(buffer)], path.split("/").pop(), { type: "image/jpeg" });
  formData.append(field, file);
}

const uploadRes = await fetch("http://localhost:3000/api/home-settings/", {
  method: "PATCH",
  body: formData,
  headers: {
    "Cookie": sessionCookie,
    "Origin": "http://localhost:3000"
  }
});

console.log("Upload status:", uploadRes.status);
const data = await uploadRes.json();
console.log("Upload response:", JSON.stringify(data, null, 2));