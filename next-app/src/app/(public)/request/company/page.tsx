import type { Metadata } from "next";
import CompanyApplicationPage from "@/features/pages/CompanyApplicationPage";

export const metadata: Metadata = {
  title: "Register Transport Company",
  description:
    "Submit your Zanzibar transport company and fleet details for verification and onboarding.",
};

export default function Page() {
  return <CompanyApplicationPage />;
}
