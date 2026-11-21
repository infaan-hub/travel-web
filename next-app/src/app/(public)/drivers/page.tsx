import type { Metadata } from "next";
import DriversDirectoryPage from "@/features/pages/DriversDirectoryPage";

export const metadata: Metadata = {
  title: "Top Drivers",
  description:
    "Browse verified Zanzibar private hire drivers from approved local companies and the public driver network.",
};

export default function DriversPage() {
  return <DriversDirectoryPage />;
}
