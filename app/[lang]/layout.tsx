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
import { I18nProvider } from "@/components/i18n-provider";
import { brand } from "@/lib/brand";
import { notFound } from "next/navigation";
import { INTL_LOCALES, isLocale, LOCALES } from "@/lib/i18n/config";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/site";
import "../globals.css";

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

/** Every page exists in each language (Cache Components needs the root params up front). */
export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return {
    metadataBase: new URL(siteUrl),
    openGraph: { siteName: brand.name, type: "website", locale: INTL_LOCALES[locale].replace("-", "_") },
    twitter: { card: "summary_large_image" },
    // Installed on iOS: open full-screen, titled "Podex" on the home screen.
    appleWebApp: { capable: true, title: brand.name, statusBarStyle: "default" },
    title: {
      default: brand.name,
      template: `%s · ${brand.name}`,
    },
    description: t.meta.description,
  };
}

export default async function RootLayout({
  children,
  modal,
  params,
}: LayoutProps<"/[lang]"> & { modal: ReactNode }) {
  // Paths the proxy doesn't rewrite (e.g. /anything.txt) arrive with a "language" that isn't one.
  if (!isLocale((await params).lang)) notFound();
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <html lang={locale} className={`${geistSans.variable} h-full antialiased`}>
      <head>
        {/* Impact (CardNexus affiliate) site verification. Impact expects `value`, not `content`. */}
        <meta name="impact-site-verification" {...{ value: "58a320ea-3248-4fa6-b0d3-d368b7bd1a27" }} />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-surface"
        >
          {t.common.skipToContent}
        </a>
        <I18nProvider locale={locale}>
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
        </I18nProvider>
      </body>
    </html>
  );
}
