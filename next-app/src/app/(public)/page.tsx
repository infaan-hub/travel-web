import type { Metadata } from "next";
import HomePage from "@/features/pages/HomePage";

export const metadata: Metadata = {
  title: "Tours, Safaris & Local Experiences",
  description:
    "Discover tours, safaris and local experiences from independent tourism companies. Compare providers and send booking requests through Travel.",
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
      "Discover tours, safaris and local experiences from independent tourism companies.",
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
