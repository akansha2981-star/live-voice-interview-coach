// The single public address of MBA Compass.
// Marketing (courses, privacy, the pre-launch holding page) and the student workspace (/dashboard)
// are served from this one host — the workspace is never given a second address.
// Browser-safe constant module: no imports, no network, no storage.

export const SITE_URL = "https://mbacompass.online";

/** Absolute URL for an app path on the public address, e.g. siteUrl("/courses"). */
export function siteUrl(path = "/") {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
