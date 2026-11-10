import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Geist } from "next/font/google";
import { AppUsageTracking } from "@/components/app-usage-tracking";
import { CardOpenProvider } from "@/components/card-open-context";
import { CardRouteEffects } from "@/components/card-route-effects";
import { FavoritesProvider } from "@/components/favorites-provider";
import { FavoritesSafetyNet } from "@/components/favorites-safety-net";
import { InstallAppPrompt } from "@/components/install-app-prompt";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { HeaderFallback, SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { UmamiAnalytics } from "@/components/umami-analytics";
import { brand } from "@/lib/brand";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f0ea" },
    { media: "(prefers-color-scheme: dark)", color: "#151311" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  openGraph: { siteName: brand.name, type: "website" },
  twitter: { card: "summary_large_image" },
  // Installed on iOS: open full-screen, titled "Podex" on the home screen.
  appleWebApp: { capable: true, title: brand.name, statusBarStyle: "default" },
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
};

export default function RootLayout({
  children,
  modal,
}: LayoutProps<"/"> & { modal: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-surface"
        >
          Skip to content
        </a>
        <FavoritesProvider>
          <Suspense fallback={null}>
            <CardOpenProvider>
              <Suspense fallback={null}>
                <CardRouteEffects />
              </Suspense>
              <Suspense fallback={<HeaderFallback />}>
                <SiteHeader />
              </Suspense>
              <div id="content" className="flex-1">
                {children}
              </div>
              <div className="pointer-events-none fixed inset-0 z-[100] isolate [&>*]:pointer-events-auto">
                {modal}
              </div>
              <SiteFooter />
              <InstallAppPrompt />
              <AppUsageTracking />
              <FavoritesSafetyNet />
              <ServiceWorkerRegistration />
              <Suspense fallback={null}>
                <UmamiAnalytics />
              </Suspense>
            </CardOpenProvider>
          </Suspense>
        </FavoritesProvider>
      </body>
    </html>
  );
}
