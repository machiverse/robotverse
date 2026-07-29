// SSR stub for browser-only libraries (jspdf, html2canvas).
// These are dynamically imported at point of use in the browser only;
// the server bundle aliases them here so workerd bundling never
// tries to resolve their browser-targeted package exports.
const stub: never = new Proxy(function () {}, {
  get() {
    throw new Error("This library is browser-only and cannot run on the server.");
  },
  apply() {
    throw new Error("This library is browser-only and cannot run on the server.");
  },
  construct() {
    throw new Error("This library is browser-only and cannot run on the server.");
  },
}) as never;

export default stub;
