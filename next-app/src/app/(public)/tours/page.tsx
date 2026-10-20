import type { Metadata } from "next";
import ToursPage from "@/features/pages/ToursPage";

export const metadata: Metadata = {
  title: 'Tours',
};

export default function Page() {
  return <ToursPage />;
}
