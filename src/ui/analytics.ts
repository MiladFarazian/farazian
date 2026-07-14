// Cloudflare Web Analytics — privacy-friendly, cookieless, no consent banner.
// Loaded on every page (homepage via main.ts, all sub-pages via project/main.ts).
//
// To enable: Cloudflare dashboard → Analytics & Logs → Web Analytics → add
// farazian.com → copy the beacon token (the "token" value in the snippet) and
// paste it below. Until then this is a no-op and ships nothing.
const CF_BEACON_TOKEN = "";

export function initAnalytics() {
  if (!CF_BEACON_TOKEN) return;
  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.setAttribute("data-cf-beacon", JSON.stringify({ token: CF_BEACON_TOKEN }));
  document.head.appendChild(s);
}
