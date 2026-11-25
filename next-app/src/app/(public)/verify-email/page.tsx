import { Suspense } from "react";
import type { Metadata } from "next";
import VerifyEmailPage from "@/features/pages/VerifyEmailPage";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm the email address on your Travel. account.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPage />
    </Suspense>
  );
}
