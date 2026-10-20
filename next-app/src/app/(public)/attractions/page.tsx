import type { Metadata } from "next";
import AttractionsPage from "@/features/pages/AttractionsPage";

export const metadata: Metadata = {
  title: 'Attractions',
};

export default function Page() {
  return <AttractionsPage />;
}
