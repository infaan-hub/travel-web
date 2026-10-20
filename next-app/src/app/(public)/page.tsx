import type { Metadata } from "next";
import HomePage from "@/features/pages/HomePage";

export const metadata: Metadata = {
  title: 'Zanzibar & Tanzania Tours',
};

export default function Page() {
  return <HomePage />;
}
