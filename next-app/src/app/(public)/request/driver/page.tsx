import type { Metadata } from "next";
import DriverApplicationPage from "@/features/pages/DriverApplicationPage";

export const metadata: Metadata = {
  title: "Apply as a Public Hire Driver",
  description: "Apply to join the public hire driver network. Your account becomes active after admin approval.",
};

export default function Page() {
  return <DriverApplicationPage />;
}
