import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Google voit les pages publiques ; le studio, l'administration, l'API et les aperçus restent privés. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/studio", "/admin", "/api/", "/preview/", "/mot-de-passe"] },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
