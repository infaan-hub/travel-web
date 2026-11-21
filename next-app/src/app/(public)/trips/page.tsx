import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/server-guard";
import TripsPage from "@/features/pages/TripsPage";

export const metadata: Metadata = {
  title: "Trips",
};

export default async function Page() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login/?from=%2Ftrips%2F");
  }
  return <TripsPage />;
}
