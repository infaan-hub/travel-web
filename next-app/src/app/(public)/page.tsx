import type { Metadata } from "next";
import HomePage from "@/features/pages/HomePage";

export const metadata: Metadata = {
  title: "Zanzibar & Tanzania Tours",
  description:
    "Curated Zanzibar and Tanzania tours, safaris, attractions and personalised itineraries with Infaan Tours & Travel.",
  alternates: { canonical: "/" },
};

export default async function Page() {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "Infaan Tours & Travel",
    url: base,
    description:
      "Curated Zanzibar and Tanzania tours, safaris, hotels and personalised itineraries.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "TZ",
      addressLocality: "Zanzibar",
    },
    areaServed: ["Zanzibar", "Tanzania"],
    telephone: `+${process.env.WHATSAPP_NUMBER ?? "255711252758"}`,
    aggregateRating: undefined,
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
