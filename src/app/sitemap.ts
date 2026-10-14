import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Plan du site pour Google : uniquement les pages publiques. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  const pages: [string, number][] = [["/", 1], ["/themes", 0.8], ["/inscription", 0.8], ["/contact", 0.5], ["/mentions-legales", 0.2], ["/conditions", 0.2], ["/confidentialite", 0.2], ["/cookies", 0.2]];
  return pages.map(([p, priority]) => ({ url: `${base}${p}`, changeFrequency: p === "/" ? "weekly" : "monthly", priority }));
}
