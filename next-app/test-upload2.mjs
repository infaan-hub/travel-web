import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Login and get session cookie
const res = await fetch("http://localhost:3000/api/token/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin123" })
});

console.log("Login status:", res.status);
const data = await res.json();
console.log("Login response:", JSON.stringify(data, null, 2));

const cookies = res.headers.getSetCookie();
console.log("Cookies:", cookies);

const cookie = cookies.find(c => c.startsWith("infaan_session"));
if (cookie) {
  const sessionCookie = cookie.split(";")[0];
  console.log("\nSession cookie:", sessionCookie);

  // Now test upload
  const file = new File(["test content"], "test.jpg", { type: "image/jpeg" });
  const formData = new FormData();
  formData.append("more_experiences_image_1", new File(["test content"], "test.jpg", { type: "image/jpeg" }));

  const res2 = await fetch("http://localhost:3000/api/home-settings/", {
    method: "PATCH",
    body: formData,
    headers: { "Cookie": sessionCookie }
  });

  console.log("\nUpload status:", res2.status);
  const data = await res2.json();
  console.log("Upload response:", JSON.stringify(data, null, 2));
}