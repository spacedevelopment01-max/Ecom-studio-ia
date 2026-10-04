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
import { sectionSchema, type ThemeSpec } from "@/lib/theme/spec";

export const runtime = "nodejs";

/** Derniers rendus (par version du thème et type de section). */
const cache = new Map<string, string>();

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const cur = currentTheme(p.id);
  if (!cur) throw new HttpError(409, L("Aucune boutique.", "No store yet."));
  const type = new URL(req.url).searchParams.get("type") ?? "";
  if (!/^[\w-]{1,80}$/.test(type) || !sectionSchema(cur.spec, type)) throw new HttpError(404, L("Section inconnue.", "Unknown section."));
  const key = `${cur.version.id}:${type}`;
  let html = cache.get(key);
  if (!html) {
    const filled = withProjectMedia(cur.spec, type);
    const res = applyOps(cur.spec, [{ op: "add_section", template: "index", type, settings: filled.settings as any, blocks: filled.blocks as any, position: { index: 0 } } as any], { targeted: new Set(), overrideLocks: true });
    if (!res.applied.length) throw new HttpError(400, res.rejected.map((r) => r.reason).join(" ; ") || L("Aperçu impossible.", "Preview unavailable."));
    // Page d'accueil réduite à la seule section ajoutée ; en-tête et pied de page masqués.
    const spec: ThemeSpec = res.spec;
    const index = spec.templates.index;
    const added = index.order[0];
    index.order = [added];
    index.sections = { [added]: index.sections[added] };
    for (const g of Object.values(spec.groups)) for (const s of Object.values(g.sections)) (s as { disabled?: boolean }).disabled = true;
    const r = await renderPage({ spec, base: `/preview/${p.id}/v/${cur.version.id}`, cart: [] }, "/", new URLSearchParams());
    // Aperçu non interactif (pas de navigation), animations d'apparition jouées tout de suite.
    html = r.html.replace("</head>", `<style>.es-fab{display:none!important}a,button,input,select,textarea,form{pointer-events:none!important}html,body{overflow-x:hidden}</style></head>`).replace("</body>", `<script>document.querySelectorAll('.reveal,[data-reveal]').forEach(function(e){e.classList.add('is-visible','in')})</script></body>`);
    if (cache.size > 200) cache.delete(cache.keys().next().value!);
    cache.set(key, html);
  }
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, max-age=300", "X-Frame-Options": "SAMEORIGIN" } });
});
