/**
 * Thème sur mesure du projet (SINA, étape 6), en page vivante : toutes ses pages, ordinateur et téléphone.
 * ?studio=1 ajoute la désignation d'un élément (le client pointe ce qu'il veut changer, SINA le reçoit).
 * Lecture seule : permise aussi pendant la construction avec SINA (mode chantier).
 */
import crypto from "node:crypto";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import { L } from "@/lib/i18n-server";
import { loadProject } from "@/lib/projects";
import type { Ctx } from "@/lib/route-helpers";
import { loadConcepts, loadCustomTheme } from "@/lib/syna-agent/custom-theme/theme";
import { renderCustomTheme } from "@/lib/syna-agent/custom-theme/render";
import { builderAssets, builderTheme, catalogAssets, catalogTheme } from "@/lib/syna-agent/custom-theme/builder";

export const runtime = "nodejs";

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  ownedProject(user, id);
  const p = loadProject(id);
  const q = new URL(req.url).searchParams;
  // Concept proposé (A ou B) : l'accueil et la page qui vend, avant le choix du client (lecture seule).
  const concept = q.get("concept");
  const t = concept === "A" || concept === "B" ? loadConcepts(id)?.[concept]?.theme ?? null : loadCustomTheme(id);
  if (!t) throw new HttpError(404, L("Aucun thème sur mesure pour ce projet.", "No custom theme for this project."));
  const nonce = crypto.randomBytes(12).toString("base64");
  // ?builder=1 : le client monte lui-même son accueil, section par section (essai du propriétaire, gratuit, rien d'enregistré).
  const builder = q.get("builder") === "1" && !concept ? builderTheme(t, { fashion: /mode|v[êe]tement|chaussure|bijou/i.test(`${p.product?.category ?? ""} ${p.product?.name ?? ""}`) }) : null;
  let html = renderCustomTheme(p, builder ? builder.theme : t, { studio: q.get("studio") === "1" && !concept && !builder, embed: q.get("embed") === "1", nonce, ...(builder ? { title: `${p.brand?.name || p.name} — construis ton accueil` } : {}) });
  if (builder) { const a = builderAssets(builder.slots); html = html.replace("</body>", `<style>${a.css}</style><script nonce="${nonce}">${a.js}</script></body>`); }
  // ?catalog=classique|moderne : la banque complète des sections de ce style, rangées par famille (lecture seule).
  const cat = q.get("catalog");
  if ((cat === "classique" || cat === "moderne") && !concept) {
    const c = catalogTheme(t, cat);
    const a = catalogAssets(c.items, cat, { label: cat === "classique" ? "le style Moderne" : "le style Classique", href: `?catalog=${cat === "classique" ? "moderne" : "classique"}` });
    html = renderCustomTheme(p, c.theme, { nonce, title: `Banque des sections — ${cat}` }).replace("</body>", `<style>${a.css}</style><script nonce="${nonce}">${a.js}</script></body>`);
  }
  // Seuls les scripts du rendu (bibliothèque du Studio) s'exécutent : aucun script venu d'une section retouchée.
  const csp = [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}'`, "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com", "img-src 'self' data: blob:", "media-src 'self' blob:", "connect-src 'none'",
    "frame-ancestors 'self'", "form-action 'none'", "base-uri 'self'",
  ].join("; ");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": csp, "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
});
