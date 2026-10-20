import type { Metadata } from "next";
import AdminTravelPage from "@/features/pages/AdminTravelPage";

export const metadata: Metadata = {
  title: 'Travel Resources',
};

export default function Page() {
  return <AdminTravelPage />;
}
