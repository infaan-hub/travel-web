import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { VisitorTracker } from "@/components/VisitorTracker";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "Infaan Tours & Travel | Zanzibar & Tanzania",
    template: "%s | Infaan Tours & Travel",
  },
  description:
    "Discover Zanzibar beaches, Tanzania safaris, curated tours, attractions and custom travel itineraries with Infaan Tours & Travel.",
  keywords: [
    "Zanzibar tours",
    "Tanzania safari",
    "Zanzibar travel",
    "Tanzania holiday",
    "Infaan Tours",
  ],
  openGraph: {
    title: "Infaan Tours & Travel",
    description:
      "Curated Zanzibar and Tanzania tours, safaris, hotels and personalized itineraries.",
    type: "website",
    siteName: "Infaan Tours & Travel",
  },
  twitter: {
    card: "summary_large_image",
    title: "Infaan Tours & Travel",
    description: "Explore Zanzibar and Tanzania with local travel experts.",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <VisitorTracker />
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
