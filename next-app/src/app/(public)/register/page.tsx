import type { Metadata } from "next";
import RegisterPage from "@/features/pages/RegisterPage";

export const metadata: Metadata = {
  title: 'Create Account',
};

export default function Page() {
  return <RegisterPage />;
}
