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
import PwaDownloadBadge from "@/components/PwaDownloadBadge";
import PwaPermissionPopups from "@/components/PwaPermissionPopups";
import PwaBottomNav from "@/components/PwaBottomNav";
import PwaUpdatePrompt from "@/components/PwaUpdatePrompt";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ModalA11y } from "@/components/ModalA11y";
import { VisitorTracker } from "@/components/VisitorTracker";
import { Geist, Inter, Playfair_Display } from "next/font/google";
import { cn } from "@/lib/utils";
import {
  DEFAULT_OG_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_TITLE,
  DEFAULT_TITLE,
  SITE_NAME,
  resolveMetadataBase,
} from "@/lib/seo";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Travel.",
  },
  description: DEFAULT_OG_DESCRIPTION,
  keywords: [
    "Zanzibar private hire",
    "Zanzibar airport transfer",
    "Zanzibar verified drivers",
    "Zanzibar tours",
    "Tanzania travel",
    "Travel.",
  ],
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE_NAME,
    title: DEFAULT_OG_TITLE,
    description: DEFAULT_OG_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_OG_TITLE,
    description: DEFAULT_OG_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
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
            <PwaDownloadBadge />
            <PwaPermissionPopups />
            <PwaBottomNav />
            <PwaUpdatePrompt />
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
