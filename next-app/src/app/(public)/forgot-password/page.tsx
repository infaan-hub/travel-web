import type { Metadata } from "next";
import ForgotPasswordPage from "@/features/pages/ForgotPasswordPage";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a password reset code for your Infaan Tours account.",
};

export default function Page() {
  return <ForgotPasswordPage />;
}
