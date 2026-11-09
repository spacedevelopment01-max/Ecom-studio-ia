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
import { loadCustomTheme } from "@/lib/syna-agent/custom-theme/theme";
import { renderCustomTheme } from "@/lib/syna-agent/custom-theme/render";

export const runtime = "nodejs";

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  ownedProject(user, id);
  const p = loadProject(id);
  const t = loadCustomTheme(id);
  if (!t) throw new HttpError(404, L("Aucun thème sur mesure pour ce projet.", "No custom theme for this project."));
  const nonce = crypto.randomBytes(12).toString("base64");
  const html = renderCustomTheme(p, t, { studio: new URL(req.url).searchParams.get("studio") === "1", nonce });
  // Seuls les scripts du rendu (bibliothèque du Studio) s'exécutent : aucun script venu d'une section retouchée.
  const csp = [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}'`, "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com", "img-src 'self' data: blob:", "media-src 'self' blob:", "connect-src 'none'",
    "frame-ancestors 'self'", "form-action 'none'", "base-uri 'self'",
  ].join("; ");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": csp, "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
});
