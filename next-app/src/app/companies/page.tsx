import type { Metadata } from "next";
import CompaniesPage from "@/features/pages/CompaniesPage";

export const metadata: Metadata = {
  title: "Companies",
  description:
    "Compare verified Zanzibar and Tanzania tourism and private-hire companies, service areas, active fleets, and published trips.",
};

export default function Page() {
  return <CompaniesPage />;
}
