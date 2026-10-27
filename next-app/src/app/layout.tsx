import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./travel-theme.css";
import { AuthProvider } from "@/context/AuthContext";
import AppFrame from "@/components/AppFrame";
import { ToastProvider } from "@/components/ToastProvider";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { PushPrompt } from "@/components/PushPrompt";
import PwaSplash from "@/components/PwaSplash";
import PwaPermissionPopups from "@/components/PwaPermissionPopups";
import PwaBottomNav from "@/components/PwaBottomNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
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
    default: "Travel. | Tours, safaris & local experiences",
    template: "%s | Travel.",
  },
  description:
    "Discover tours, safaris and local experiences from independent tourism companies. Compare providers and send booking requests through Travel.",
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
      "Discover tours, safaris and local experiences from independent tourism companies.",
    type: "website",
    siteName: "Travel.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Travel.",
    description: "Explore experiences from tourism companies across multiple destinations.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Travel.",
  },
  formatDetection: { telephone: false },
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
          <RealtimeProvider>
          <ToastProvider>
            <VisitorTracker />
            <AppFrame>{children}</AppFrame>
            <PushPrompt />
            <PwaSplash />
            <PwaPermissionPopups />
            <PwaBottomNav />
            <ServiceWorkerRegister />
            <ModalA11y />
          </ToastProvider>
           </RealtimeProvider>

          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
