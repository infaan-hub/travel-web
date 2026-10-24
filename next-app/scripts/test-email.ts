import "dotenv/config";
import { sendEmail, emailEnabled } from "../src/lib/email";

async function main() {
  if (!emailEnabled()) {
    console.error("Email delivery is not configured. Check SMTP_* env vars.");
    process.exitCode = 1;
    return;
  }
  const to = process.env.TEST_EMAIL_TO || process.env.SMTP_USER;
  if (!to) {
    console.error("Set TEST_EMAIL_TO or SMTP_USER.");
    process.exitCode = 1;
    return;
  }
  const result = await sendEmail({
    to,
    subject: "Travel Island SMTP test",
    text: "This is a test email confirming SMTP delivery is working.",
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.sent) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});