import type { Metadata } from "next";
import ResetPasswordPage from "@/features/pages/ResetPasswordPage";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Infaan Tours account.",
};

export default function Page() {
  return <ResetPasswordPage />;
}
