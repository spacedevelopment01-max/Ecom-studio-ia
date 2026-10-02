import { handle } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { currentTheme, themeVersion } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { exportThemeZip, themeFingerprint } from "@/lib/theme/compile";
import { libraryLoader as loader } from "@/lib/theme/loader";
import { exportKit, exportPrestaShop, exportWooCommerce } from "@/lib/theme/platforms";
import { saveAsset } from "@/lib/library";

export const runtime = "nodejs";

/** Export de la version affichée — mêmes fichiers que l'aperçu. Une copie est rangée dans « Exports de thèmes ». */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const u = new URL(req.url).searchParams;
  const platform = u.get("platform") ?? "shopify";
  const v = u.get("version") ? themeVersion(p.id, u.get("version")!) : currentTheme(p.id);
  if (!v) throw new HttpError(404, "Aucune boutique à exporter.");
  let zip: Buffer;
  let name: string;
  let note = "";
  if (platform === "shopify") {
    const r = await exportThemeZip(v.spec, loader);
    zip = r.zip;
    name = `${v.spec.store.shopName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}-shopify-v${v.version.number}.zip`;
    note = r.skipped.length ? `Fichiers non inclus : ${r.skipped.join(", ")}` : "";
  } else if (platform === "woocommerce") ({ zip, name } = await exportWooCommerce(v.spec, loader));
  else if (platform === "prestashop") ({ zip, name } = await exportPrestaShop(v.spec, loader));
  else if (platform === "wix" || platform === "squarespace") ({ zip, name } = await exportKit(v.spec, loader, platform));
  else throw new HttpError(400, "Plateforme inconnue.");
  await saveAsset({ projectId: p.id, userId: user.id, data: zip, name, mime: "application/zip", kind: "archive", role: "theme-export", folderKey: "shop.exports", origin: "export", meta: { platform, themeVersion: v.version.number, versionId: v.version.id, fingerprint: themeFingerprint(v.spec), note } });
  return new Response(new Uint8Array(zip), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`, "X-Theme-Fingerprint": themeFingerprint(v.spec) } });
});
