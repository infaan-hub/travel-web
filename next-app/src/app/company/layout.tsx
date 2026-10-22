import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Company workspace",
    template: "%s | Company | Travel.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
