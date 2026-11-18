import type { Metadata } from "next";
import HomePage from "@/features/pages/HomePage";

export const metadata: Metadata = {
  title: "Private Hire Transport",
  description:
    "Book private hire vehicles and drivers for airport transfers, local journeys, and longer trips with trusted transport providers.",
  alternates: { canonical: "/" },
};

export default async function Page() {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Travel.",
    url: base,
    description:
      "Book private hire vehicles and drivers for journeys across Tanzania.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePage />
    </>
  );
}
