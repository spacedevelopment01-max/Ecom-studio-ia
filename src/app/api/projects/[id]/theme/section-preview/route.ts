/**
 * Aperçu d'une section de la bibliothèque, rendue seule dans le thème du projet
 * (ses couleurs, polices, photos et vidéos), comme l'aperçu au survol de l'éditeur Shopify.
 * Rien n'est enregistré : la section est ajoutée à une copie du thème, le temps du rendu.
 */
import { HttpError } from "@/lib/auth";
import { handle } from "@/lib/http";
import { L } from "@/lib/i18n-server";
import { currentTheme } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { applyOps } from "@/lib/theme/ops";
import { renderPage } from "@/lib/theme/render";
import { withProjectMedia } from "@/lib/theme/section-defaults";
import { contentContext } from "@/lib/theme/section-content";
import { PREVIEW_DESIGN_MODE, previewNeighbors } from "@/lib/theme/section-copy-proof";
import { pick } from "@/lib/i18n";
import { themeLang } from "@/lib/theme/spec";
import { sectionSchema, type ThemeSpec } from "@/lib/theme/spec";
import { previewCsp, previewSegment } from "@/lib/theme/preview-access";

export const runtime = "nodejs";

/** Derniers rendus (par version du thème et type de section). */
const cache = new Map<string, string>();

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const cur = currentTheme(p.id);
  if (!cur) throw new HttpError(409, L("Aucune boutique.", "No store yet."));
  const type = new URL(req.url).searchParams.get("type") ?? "";
  if (!/^[\w-]{1,80}$/.test(type) || !sectionSchema(cur.spec, type)) throw new HttpError(404, L("Section inconnue.", "Unknown section."));
  const key = `${cur.version.id}:${type}`;
  // En développement, les fichiers du thème de base changent : pas de mémoire des rendus.
  // Fichiers du thème lus par l'aperçu cloisonné (sans cookie) : clé d'aperçu dans l'adresse.
  const base = `/preview/${p.id}/v/${cur.version.id}`;
  const keyed = `/preview/${p.id}/v/${previewSegment(cur.version.id, user.id, p.id)}`;
  let html = process.env.NODE_ENV === "production" ? cache.get(key) : undefined;
  if (!html) {
    const cctx = contentContext(p, cur.spec, true);
    const filled = withProjectMedia(cur.spec, type, {}, undefined, cctx);
    // Séparateurs : rendus entre deux sections voisines factices, sinon on ne voit qu'une bande.
    const around = sectionSchema(cur.spec, "rich-text") ? previewNeighbors(type, filled.settings, sectionSchema(cur.spec, type)!, cctx, cur.spec) : null;
    const res = applyOps(cur.spec, [
      { op: "add_section", template: "index", type, settings: (around?.settings ?? filled.settings) as any, blocks: filled.blocks as any, position: { index: 0 } } as any,
      ...(around ? [{ op: "add_section", template: "index", ...around.before, position: { index: 0 } }, { op: "add_section", template: "index", ...around.after, position: { index: 2 } }] as any[] : []),
    ], { targeted: new Set(), overrideLocks: true });
    if (!res.applied.length) throw new HttpError(400, res.rejected.map((r) => r.reason).join(" ; ") || L("Aperçu impossible.", "Preview unavailable."));
    // Page d'accueil réduite à la seule section ajoutée (et ses voisines d'aperçu) ; en-tête et pied de page masqués.
    const spec: ThemeSpec = res.spec;
    const index = spec.templates.index;
    index.order = index.order.slice(0, res.applied.length);
    index.sections = Object.fromEntries(index.order.map((id) => [id, index.sections[id]]));
    for (const g of Object.values(spec.groups)) for (const s of Object.values(g.sections)) (s as { disabled?: boolean }).disabled = true;
    const r = await renderPage({ spec, base, cart: [], designMode: PREVIEW_DESIGN_MODE.has(type) }, "/", new URLSearchParams());
    // Aperçu non interactif (pas de navigation), animations d'apparition jouées tout de suite.
    // Bandeau discret : l'aperçu montre des contenus d'exemple (avis, logos…) que le marchand remplacera.
    const banner = filled.samples ? `<div style="position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:2147483647;background:rgba(17,17,17,.82);color:#fff;font:600 11px/1.2 system-ui,sans-serif;padding:7px 12px;border-radius:999px;letter-spacing:.01em;pointer-events:none;white-space:nowrap;max-width:calc(100% - 24px);overflow:hidden;text-overflow:ellipsis">${pick(themeLang(cur.spec), "Contenus d'exemple · remplacés par les vôtres", "Example content · replaced by yours")}</div>` : "";
    html = r.html.replace("</head>", `<style>.es-fab{display:none!important}a,button,input,select,textarea,form{pointer-events:none!important}html,body{overflow-x:hidden}</style></head>`).replace("</body>", `${banner}<script>document.querySelectorAll('.reveal,[data-reveal]').forEach(function(e){e.classList.add('is-visible','in','is-in')});(function(){function h(){try{parent.postMessage({source:'es-section-preview',height:document.documentElement.scrollHeight},'*')}catch(e){}}if(document.readyState==='complete')h();else addEventListener('load',h);setTimeout(h,400)})()</script></body>`);
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    cache.set(key, html);
  }
  // Rendu mis en mémoire sans clé (elle expire) : la clé du moment est ajoutée à chaque envoi.
  const out = html.split(`${base}/`).join(`${keyed}/`);
  // Bac à sable : le JavaScript des sections ne peut rien faire avec la session du client.
  return new Response(out, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Frame-Options": "SAMEORIGIN", "Content-Security-Policy": previewCsp("allow-scripts"), "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
});
