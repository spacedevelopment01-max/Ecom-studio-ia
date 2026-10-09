import { handle } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { currentTheme, themeVersion } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { saveAsset } from "@/lib/library";
import { L, uiLang } from "@/lib/i18n-server";
import { requirePlan } from "@/lib/plan-gates";
import { shopifyProductsCsv, wooProductsCsv } from "@/lib/theme/catalog-export";
import { CMS_PLATFORMS } from "@/lib/cms-v2/export";
import { exportAndRecord } from "@/lib/cms-v2/record";
import type { CmsPlatform } from "@/lib/cms-v2/types";

export const runtime = "nodejs";

/**
 * Export de la version affichée (CMS Engine V2) — mêmes gabarits que l'aperçu. Chaque export est contrôlé (Quality
 * Gate « cms_export_v2 », verdict enregistré), rangé dans « Exports de thèmes » avec son numéro de version (une
 * nouvelle génération n'écrase jamais la précédente). Un export REFUSÉ n'est pas proposé au téléchargement.
 */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  requirePlan(user);
  const u = new URL(req.url).searchParams;
  const platform = u.get("platform") ?? "shopify";
  const v = u.get("version") ? themeVersion(p.id, u.get("version")!) : currentTheme(p.id);
  if (!v) throw new HttpError(404, L("Aucune boutique à exporter.", "No store to export."));
  if (platform === "shopify-csv" || platform === "woocommerce-csv") {
    const csv = Buffer.from("﻿" + (platform === "shopify-csv" ? shopifyProductsCsv(v.spec) : wooProductsCsv(v.spec)), "utf8");
    const fname = `${v.spec.store.shopName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}-${L("produits", "products")}-${platform === "shopify-csv" ? "shopify" : "woocommerce"}.csv`;
    await saveAsset({ projectId: p.id, userId: user.id, data: csv, name: fname, mime: "text/csv", kind: "document", role: "theme-export", folderKey: "shop.exports", origin: "export", meta: { platform, themeVersion: v.version.number } });
    return new Response(new Uint8Array(csv), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fname)}` } });
  }
  if (!CMS_PLATFORMS.includes(platform as CmsPlatform)) throw new HttpError(400, L("Plateforme inconnue.", "Unknown platform."));
  const pf = platform as CmsPlatform;
  const r = await exportAndRecord({ id: p.id, userId: user.id }, { spec: v.spec, number: v.version.number, id: v.version.id }, pf, uiLang());
  if (r.verdict === "REJECTED") {
    throw new HttpError(422, L(`${r.message} Défauts : ${r.issues.slice(0, 4).join(" ; ")}`, `${r.message} Defects: ${r.issues.slice(0, 4).join("; ")}`));
  }
  const name = r.name;
  return new Response(new Uint8Array(r.zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Theme-Fingerprint": r.fingerprint,
      "X-ES-Verdict": r.verdict,
      "X-ES-Scope": r.scope ?? "none",
    },
  });
});
