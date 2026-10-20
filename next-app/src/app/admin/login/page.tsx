import type { Metadata } from "next";
import { Suspense } from "react";
import AdminLoginPage from "@/features/pages/AdminLoginPage";

export const metadata: Metadata = {
  title: "Administrator Sign In",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminLoginPage />
    </Suspense>
  );
}
