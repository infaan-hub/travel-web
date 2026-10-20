import type { Metadata } from "next";
import AdminAnalyticsPage from "@/features/pages/AdminAnalyticsPage";

export const metadata: Metadata = {
  title: 'Analytics',
};

export default function Page() {
  return <AdminAnalyticsPage />;
}
