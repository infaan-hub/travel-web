import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { ApiError } from "@/lib/api/http";
import { env } from "@/lib/env";

let transporter: Transporter | null = null;

export function isEmailConfigured(): boolean {
  const config = env();
  return Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASSWORD);
}

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const config = env();
  if (!isEmailConfigured()) {
    throw new ApiError(
      503,
      "Email system not configured. Please contact support.",
    );
  }
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT ?? 587,
    secure: config.SMTP_SECURE === "true",
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASSWORD,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export type BookingEmailInput = {
  full_name: string;
  email: string;
  phone?: string;
  tour: string;
  destination?: string;
  travelers?: number;
  children?: number;
  travel_date?: string;
  notes?: string;
  address?: string;
};

/**
 * Sends the booking notification and only reports success after the SMTP
 * server accepted the message. The recipient is always configured server-side.
 */
export async function sendBookingNotification(input: BookingEmailInput) {
  const config = env();
  const recipient = config.BOOKING_NOTIFICATION_EMAIL;
  if (!recipient) {
    throw new ApiError(503, "Booking notification recipient is not configured.");
  }

  const createdAt = new Date().toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  });

  const body = `New Tour Booking Received

Customer Information:
Name: ${input.full_name}
Email: ${input.email}
Phone: ${input.phone ?? ""}

Tour Information:
Tour Name: ${input.tour}
Destination: ${input.destination ?? ""}
Travel Date: ${input.travel_date ?? ""}
Number of Adults: ${input.travelers ?? ""}
Number of Children: ${input.children ?? 0}

Additional Information:
Special Requests: ${input.notes ?? ""}
Address: ${input.address ?? ""}

Booking Time: ${createdAt} UTC
`;

  try {
    const info = await getTransporter().sendMail({
      from: config.EMAIL_FROM || config.SMTP_USER,
      to: recipient,
      replyTo: input.email,
      subject: "New Tour Booking",
      text: body,
    });
    return { messageId: info.messageId };
  } catch (error) {
    console.error("Booking email failed", error);
    throw new ApiError(502, "Unable to send booking email.");
  }
}

export function buildWhatsAppUrl(input: {
  full_name?: string;
  email?: string;
  phone?: string;
  tour?: string;
  travelers?: string | number;
  travel_date?: string;
  address?: string;
  notes?: string;
}): string {
  const config = env();
  const message = `New Booking Request

Name: ${input.full_name ?? ""}
Email: ${input.email ?? ""}
Phone: ${input.phone ?? ""}
Tour: ${input.tour ?? ""}
Travelers: ${input.travelers ?? ""}
Date: ${input.travel_date ?? ""}
Address: ${input.address ?? ""}
Notes: ${input.notes ?? ""}`;
  return `https://wa.me/${config.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
