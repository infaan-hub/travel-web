import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/ToastProvider";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { PushPrompt } from "@/components/PushPrompt";
import { VisitorTracker } from "@/components/VisitorTracker";
import { Geist, Inter, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

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
    <html lang="en" className={cn("font-sans", geist.variable, inter.variable, playfair.variable)}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <AuthProvider>
          <CurrencyProvider>
          <ToastProvider>
            <VisitorTracker />
            <div className="app-layout">
              <Sidebar />
              <main className="main-content" id="main-content">{children}</main>
            </div>
            <PushPrompt />
          </ToastProvider>
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
