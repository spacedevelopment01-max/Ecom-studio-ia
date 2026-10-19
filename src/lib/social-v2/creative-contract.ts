import { z } from "zod";
import type { PostBrief } from "./deps";

export const EditorialBlockSchema = z.object({
  kind: z.enum(["paragraph", "tip", "step", "question", "answer", "check", "quote", "source"]),
  title: z.string().max(300).optional(),
  text: z.string().min(1).max(4000),
});
const SlideSchema = z.object({ title: z.string().min(1).max(300), blocks: z.array(EditorialBlockSchema).min(1).max(12) });
export const EditorialSchema = z.object({
  role: z.string().max(120).optional(),
  goal: z.string().max(300).optional(),
  structure: z.enum(["advice", "faq", "checklist", "tutorial", "infographic", "quote", "editorial_photo", "discovery", "comparison", "behind_scenes", "community", "seasonal", "offer", "carousel"]).optional(),
  blocks: z.array(EditorialBlockSchema).max(24).optional(),
  sources: z.array(z.object({ label: z.string().max(300), text: z.string().max(5000), url: z.string().url().optional(), verified: z.boolean() })).max(20).optional(),
  steps: z.array(z.string().min(1).max(2000)).max(20).optional(),
  slides: z.array(SlideSchema).min(2).max(10).optional(),
  testimonial: z.object({ quote: z.string().min(1).max(4000), author: z.string().max(120).optional(), source: z.string().min(1).max(1000), verified: z.boolean(), authorized: z.boolean() }).optional(),
});
export type Editorial = z.infer<typeof EditorialSchema>;
export type EditorialBlock = z.infer<typeof EditorialBlockSchema>;
export type CreativePurpose = "ad" | "organic";
export const commercialCta = (text: string) => /\b(acheter|commander|acheter maintenant|profitez de|devis|réservez|réserver|shop now|buy now|order now|book now|get a quote)\b/i.test(text);
const missing = /\[(?:À|A) compléter[^\]]*\]|\[To complete[^\]]*\]/i;

/** The persisted editorial brief is data, not a slogan. No sector proportions or demo-name rules. */
export function creativeContract(post: PostBrief, purpose: CreativePurpose) {
  const e = EditorialSchema.parse(post.editorial ?? {});
  const data = post.editorialData ?? {};
  const role = e.role ?? String(data.roleTitle ?? data.role ?? post.pillar ?? "publication");
  const structure = e.structure ?? (/avis|review|testimon|quote|citation/i.test(role) ? "quote" : /faq|question/i.test(role) ? "faq" : /check/i.test(role) ? "checklist" : /étape|step|tutor/i.test(role) ? "tutorial" : /conseil|advice|erreur|mistake/i.test(role) ? "advice" : "editorial_photo");
  if (purpose === "organic" && (structure === "quote" || /avis|review|testimon|quote|citation/i.test(role) || e.blocks?.some(b=>b.kind==="quote") || e.slides?.some(s=>s.blocks.some(b=>b.kind==="quote"))) && (!e.testimonial?.verified || !e.testimonial.authorized))
    throw new Error("Avis indisponible : fournissez une citation vérifiable, sa source et l'autorisation, ou choisissez un autre contenu. Aucun avis fabriqué.");
  const blocks: EditorialBlock[] = e.blocks?.length ? [...e.blocks] : (post.caption ?? "").split(/\n\s*\n/).map(x=>x.trim()).filter(x=>x && !/^#/.test(x) && !missing.test(x)).map(text=>({kind:"paragraph",text}));
  for (const text of e.steps ?? []) blocks.push({kind:"step",text});
  if (e.testimonial) {
    if (!e.testimonial.verified || !e.testimonial.authorized) throw new Error("Avis non vérifié ou non autorisé : aucun visuel généré.");
    // Quote and attribution are immutable, never rewritten by a copywriter or vocabulary substitution.
    if(!post.series) {
      blocks.push({kind:"quote",text:e.testimonial.quote});
      if (e.testimonial.author) blocks.push({kind:"source",text:e.testimonial.author});
    }
  }
  const allowCommercial = purpose === "ad" || structure === "offer";
  return {
    revision:"purpose-2",entryPoint:post.entryPoint??null,purpose, role, title:post.title, request:post.request??null, pillar:post.pillar, objective:post.objective,
    goal: e.goal ?? (purpose === "ad" ? "campaign / conversion" : "informer, aider, inspirer, dialoguer ou fidéliser selon le rôle"),
    structure, caption:post.caption, blocks, sources:e.sources ?? [], steps:e.steps ?? [],
    missing: [...(post.caption ?? "").matchAll(new RegExp(missing.source,"gi"))].map(x=>x[0]),
    testimonial:e.testimonial ?? null, slides:e.slides ?? [],
    editorialData:data, series:post.series ?? null, advertising:purpose === "ad" ? post.advertising ?? null : null,
    productPresence:purpose === "ad" ? "prominent according to campaign direction" : "optional: secondary or absent when the editorial subject calls for it",
    cta:allowCommercial ? "adapted to the declared objective and confirmed offer" : "optional editorial action: save, discuss, share; never force a purchase, booking or quote",
    allowCommercial,
  };
}
export type CreativeContract = ReturnType<typeof creativeContract>;

/** A carousel has real, ordered pages. Existing full content supplies the sequence; nothing is silently shortened. */
export function editorialPages(post: PostBrief) {
  const c=creativeContract(post,"organic");
  if (c.slides.length) return c.slides;
  const pages=c.blocks.map((block,i)=>({title:i===0?post.title:`${post.title} · ${i+1}`,blocks:[block]}));
  if(pages.length<2) throw new Error("Carrousel incomplet : fournissez au moins deux étapes/blocs ou pages utiles. Un seul PNG n'est pas un carrousel.");
  if(pages.length>10) throw new Error("Carrousel trop long : organisez le contenu en 2 à 10 pages, aucune étape tronquée.");
  return pages;
}
export const publicationUnits=(post:PostBrief)=>post.format==="carousel"?editorialPages(post).length:1;

export function creativeInstruction(c:CreativeContract) {
  return c.purpose==="ad"
    ? "PUBLICITÉ COMMERCIALE : préserver la stratégie, audience, bénéfice, angle, offre confirmée, preuves disponibles, direction et concept déjà établis dans advertising. Concevoir une campagne de conversion spécifique à la plateforme ; ne pas remplacer cette direction par une consigne sociale générique."
    : `PUBLICATION ORGANIQUE : concevoir un contenu éditorial utile (${c.structure}), pas une publicité sans bouton. Préserver rôle/pilier/objectifs, caption entière, sources, étapes et blocs. Adapter la structure (conseil, FAQ, checklist, schéma vérifiable, citation ou photographie éditoriale) au sujet et aux faits disponibles. Le produit peut être discret ou absent. Aucun achat forcé. Les sources non vérifiées sont des pistes, jamais des preuves. Ne pas inventer de réponse, de réalisation client, d'avis ou de personne. Les citations et attributions autorisées sont exactes, sans réécriture. Conserver la séquence et la famille graphique des pages d'un carrousel, avec une progression utile. Les blocs indiqués seront imprimés mot pour mot ; réserver suffisamment d'espace et une hiérarchie lisible sur mobile. Ne pas les réduire à une accroche.`;
}
