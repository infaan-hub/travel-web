import type { Metadata } from "next";
import { Suspense } from "react";
import AdminTourPlanPage from "@/features/pages/AdminTourPlanPage";

export const metadata: Metadata = {
  title: "Tour Plan",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminTourPlanPage />
    </Suspense>
  );
}
