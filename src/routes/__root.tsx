import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { HelmetProvider } from "react-helmet-async";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { RobotComparisonProvider } from "@/contexts/RobotComparisonContext";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { GlobalEmailVerificationHandler } from "@/components/GlobalEmailVerificationHandler";
import { AutoSignInPopup } from "@/components/AutoSignInPopup";
import AIAssistantWidget from "@/components/ai-assistant/AIAssistantWidget";
import NotFound from "@/pages/NotFound";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "../styles.css?url";

const STRUCTURED_DATA = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.robotverse.in/#organization",
      name: "RobotVerse",
      url: "https://www.robotverse.in/",
      logo: {
        "@type": "ImageObject",
        url: "https://www.robotverse.in/robotverse-logo.png",
      },
      description:
        "Marketplace for new, used, and refurbished industrial robots, spare parts, and automation services.",
      sameAs: ["https://linkedin.com/company/robotverse"],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["English", "Tamil"],
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://www.robotverse.in/#website",
      url: "https://www.robotverse.in/",
      name: "RobotVerse",
      alternateName: "RobotVerse Marketplace",
      publisher: { "@id": "https://www.robotverse.in/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://www.robotverse.in/robots?search={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
});

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "RobotVerse | Marketplace for New & Used Industrial Robots" },
      {
        name: "description",
        content:
          "RobotVerse is a marketplace for new, used, and refurbished industrial robots, spare parts, and automation services. Browse robots by brand, payload, reach, and application.",
      },
      { name: "author", content: "RobotVerse" },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "RobotVerse | Marketplace for New & Used Industrial Robots" },
      {
        property: "og:description",
        content:
          "Explore new, used, and refurbished industrial robots, spare parts, and automation services on RobotVerse.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.robotverse.in/" },
      { property: "og:image", content: "https://www.robotverse.in/og-image.jpg" },
      { property: "og:site_name", content: "RobotVerse" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "RobotVerse | Marketplace for New & Used Industrial Robots" },
      {
        name: "twitter:description",
        content:
          "Explore new, used, and refurbished industrial robots, spare parts, and automation services on RobotVerse.",
      },
      { name: "twitter:image", content: "https://www.robotverse.in/og-image.jpg" },
      { name: "theme-color", content: "#3b82f6" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "RobotVerse" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "canonical", href: "https://www.robotverse.in/" },
      { rel: "icon", type: "image/png", href: "/robotverse-logo.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/robotverse-logo.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/robotverse-logo.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/robotverse-logo.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    ],
    scripts: [
      { type: "application/ld+json", children: STRUCTURED_DATA },
      // Google tag (gtag.js) for Google Ads
      { src: "https://www.googletagmanager.com/gtag/js?id=AW-16772903094", async: true },
      {
        children:
          'window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag("js", new Date()); gtag("config", "AW-16772903094");',
      },
      // Cloudflare Web Analytics
      {
        src: "https://static.cloudflareinsights.com/beacon.min.js",
        defer: true,
        "data-cf-beacon": '{"token": "3711a2c9cbd74d00b316c22e66c46509"}',
      },
      // Zoho SalesIQ
      {
        children:
          "window.$zoho=window.$zoho || {};$zoho.salesiq=$zoho.salesiq||{ready:function(){}}",
      },
      {
        id: "zsiqscript",
        src: "https://salesiq.zohopublic.in/widget?wc=siq3059947f424d9ad32c855c87a158c031dfcf1b8b40fa338cd70fa9317dba2065",
        defer: true,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Global notification listener component (ported from src/App.tsx)
const GlobalChatNotifications = () => {
  useChatNotifications();
  return null;
};

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RobotComparisonProvider>
              <TooltipProvider>
                <GlobalChatNotifications />
                <Toaster />
                <Sonner />
                <AIAssistantProvider>
                  <GlobalEmailVerificationHandler />
                  <AutoSignInPopup />
                  <Outlet />
                  <AIAssistantWidget />
                </AIAssistantProvider>
              </TooltipProvider>
            </RobotComparisonProvider>
          </AuthProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
      <h1 className="text-2xl font-semibold">This page didn't load</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Something went wrong while loading this page. You can try again or head back home.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
