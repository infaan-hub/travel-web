import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./travel-theme.css";
import { AuthProvider } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/ToastProvider";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { PushPrompt } from "@/components/PushPrompt";
import { ModalA11y } from "@/components/ModalA11y";
import { VisitorTracker } from "@/components/VisitorTracker";
import { Geist, Inter, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "Travel. | Zanzibar & Tanzania trips",
    template: "%s | Travel.",
  },
  description:
    "Travel. curates Zanzibar beaches, Tanzania safaris, attractions and custom itineraries in one warm, simple app.",
  keywords: [
    "Zanzibar tours",
    "Tanzania safari",
    "Zanzibar travel",
    "Tanzania holiday",
    "Travel.",
  ],
  applicationName: "Travel.",
  openGraph: {
    title: "Travel.",
    description:
      "Curated Zanzibar and Tanzania tours, safaris, hotels and personalized itineraries.",
    type: "website",
    siteName: "Travel.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel.",
    description: "Explore Zanzibar and Tanzania with local travel experts.",
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0F6B6B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
            <ModalA11y />
          </ToastProvider>
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
