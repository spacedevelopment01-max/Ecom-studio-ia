/**
 * « Tout télécharger » de l'onglet Marque (planche en vrai, 25 novembre 2026) : les dix versions du logo, les favicons,
 * les images en haute définition, la planche entière, les codes des couleurs et les polices, en un seul zip. Lecture
 * seule, gratuite.
 */
import { ownedProject, requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import type { Ctx } from "@/lib/route-helpers";
import { assetData, getAsset } from "@/lib/library";
import { loadProject } from "@/lib/projects";
import { journeyOfProject } from "@/lib/syna-agent/construction";
import { fichiersDeLaMarque, zipDeLaMarque } from "@/lib/syna-agent/brand-zip";

export const runtime = "nodejs";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  ownedProject(user, id);
  const ev = journeyOfProject(id)?.plancheEnVrai;
  if (!ev?.planche) return Response.json({ error: "Aucune planche en vrai pour l'instant." }, { status: 404 });
  const p = loadProject(id), nom = p.brand?.name?.trim() || p.name;
  const lire = (assetId: string) => { const a = getAsset(assetId); return a && a.project_id === id && !a.deleted_at ? assetData(a) : null; };
  const zip = zipDeLaMarque(fichiersDeLaMarque(ev, nom, lire));
  const fichier = `${nom.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "marque"}-marque.zip`;
  return new Response(Buffer.from(zip), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${fichier}"`, "Cache-Control": "private, no-store" } });
});
