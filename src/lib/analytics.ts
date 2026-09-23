declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Push an event into the GTM dataLayer. GA4 and Google Ads are configured
 * inside GTM, so the app never calls gtag() directly.
 */
export const pushEvent = (event: string, params: Record<string, unknown> = {}) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
};

export const trackPageView = (pagePath: string, pageTitle: string) => {
  pushEvent('page_view', {
    page_path: pagePath,
    page_title: pageTitle,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
  });
};
