import nodemailer from "nodemailer";
import { env } from "@/lib/env";

type Transporter = ReturnType<typeof nodemailer.createTransport>;

let transporter: Transporter | null = null;
let configured = false;

function configure(): boolean {
  if (configured) return true;
  const config = env();
  if (!config.SMTP_USER || !config.SMTP_PASS) return false;
  const secure =
    config.SMTP_SECURE === "true" || Number(config.SMTP_PORT) === 465;
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: Number(config.SMTP_PORT),
    secure,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  });
  configured = true;
  return true;
}

export function emailEnabled(): boolean {
  return configure();
}

export type EmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  from?: string;
};

export async function sendEmail(
  input: EmailInput,
): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  if (!configure() || !transporter) {
    return { sent: false, error: "email delivery is not configured" };
  }
  const config = env();
  try {
    const info = await transporter.sendMail({
      from: input.from ?? config.SMTP_FROM ?? config.SMTP_USER,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    console.info("email sent", { messageId: info.messageId, to: input.to });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("email send failed", { error: message, to: input.to });
    return { sent: false, error: message };
  }
}