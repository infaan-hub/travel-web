import { describe, expect, it } from "vitest";
import { emailEnabled, sendEmail } from "@/lib/email";

describe("email delivery", () => {
  it("is disabled when SMTP credentials are missing", () => {
    expect(emailEnabled()).toBe(false);
  });

  it("returns a non-sent result when disabled", async () => {
    const result = await sendEmail({
      to: "nobody@example.com",
      subject: "test",
      text: "test",
    });
    expect(result.sent).toBe(false);
  });
});