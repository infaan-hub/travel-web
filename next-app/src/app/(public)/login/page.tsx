import type { Metadata } from "next";
import { Suspense } from "react";
import LoginPage from "@/features/pages/LoginPage";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
