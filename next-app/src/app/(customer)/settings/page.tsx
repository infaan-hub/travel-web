import type { Metadata } from "next";
import ProfilePage from "@/features/pages/ProfilePage";

export const metadata: Metadata = {
  title: 'Account Settings',
};

export default function Page() {
  return <ProfilePage />;
}
