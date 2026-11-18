import type { Metadata } from "next";
import MyTransportPage from "@/features/pages/MyTransportPage";

export const metadata: Metadata = {
  title: "My Transport",
};

export default function Page() {
  return <MyTransportPage />;
}
