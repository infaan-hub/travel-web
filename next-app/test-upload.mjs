import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

// Test the API directly with a simple upload
const file = new File(["test content"], "test.jpg", { type: "image/jpeg" });
const formData = new FormData();
formData.append("more_experiences_image_1", file);

try {
  const res = await fetch("http://localhost:3000/api/home-settings/", {
    method: "PATCH",
    body: formData,
    headers: {
      "Cookie": "infaan_session=test"
    }
  });
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
} catch (e) {
  console.log("Error:", e.message);
}