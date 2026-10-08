/**
 * Retouches en conversation propres aux sites du Theme Engine V2, faites par le moteur LOCAL (gratuites, ciblées,
 * versionnées par les opérations habituelles) : jamais de régénération complète du site.
 *  « Réduis les animations » · « Supprime les animations » · « Plus d'animations »
 *  « Change la typographie » (association suivante, refusée si les typographies sont validées par le client)
 *  « Change la disposition des bénéfices / prestations / de la liste » · « Change la disposition de l'ouverture »
 *  « Ajoute une FAQ / des étapes / des infos pratiques / un appel final » (sections V2)
 *  « Rends l'ouverture plus premium » sans IA : plus d'air, matière retirée, produit en scène quand c'est possible.
 * Une demande ambiguë ou créative (sans désignation possible) reste confiée à l'IA, avec confirmation du coût.
 */
import { L } from "../i18n-server";
import { containerOf, type ThemeSpec } from "../theme/spec";
import type { ThemeOp } from "../theme/ops";

type Sel = { template: string; section: string; kind?: string } | null;
export type V2Command = { ops: ThemeOp[]; reply: string };

/** Associations typographiques V2 (titres, texte) — licences libres (Google Fonts, bibliothèque Shopify). */
export const TYPE_PAIRINGS: { heading: string; body: string; label: string }[] = [
  { heading: "archivo_n6", body: "work_sans_n4", label: "Archivo / Work Sans" },
  { heading: "cormorant_n5", body: "jost_n4", label: "Cormorant / Jost" },
  { heading: "space_grotesk_n7", body: "inter_n4", label: "Space Grotesk / Inter" },
  { heading: "libre_baskerville_n7", body: "karla_n4", label: "Libre Baskerville / Karla" },
  { heading: "dm_sans_n7", body: "dm_sans_n4", label: "DM Sans" },
  { heading: "playfair_display_n6", body: "jost_n4", label: "Playfair Display / Jost" },
  { heading: "lora_n6", body: "work_sans_n4", label: "Lora / Work Sans" },
  { heading: "chivo_n7", body: "inter_n4", label: "Chivo / Inter" },
];

export const isV2 = (spec: ThemeSpec) => spec.meta?.engine === "v2" || (typeof spec.settings.ds_language === "string" && spec.settings.ds_language !== "none");

const LAYOUTS: Record<string, string[]> = {
  "v2-index": ["rows", "cards", "bento"],
  "v2-steps": ["line", "stack", "cards"],
  "v2-facts": ["ledger", "grid", "strip"],
  "v2-faq": ["side", "center"],
  "v2-cta": ["band", "card", "split"],
  "v2-media": ["bento", "rail"],
  "v2-split": ["media-left", "media-right", "overlap"],
};

function findSection(spec: ThemeSpec, sel: Sel, types: string[], template = "index") {
  if (sel) {
    const c = containerOf(spec, sel.template);
    const s = c?.sections[sel.section];
    if (s && types.includes(s.type)) return { template: sel.template, id: sel.section, s };
  }
  const t = sel?.template ?? template;
  const c = containerOf(spec, t);
  const id = c?.order.find((x) => c.sections[x] && types.includes(c.sections[x].type));
  return id && c ? { template: t, id, s: c.sections[id] } : null;
}

export function v2ThemeCommand(spec: ThemeSpec, message: string, selection: Sel): V2Command | null {
  if (!isV2(spec)) return null;
  const m = message.toLowerCase();
  const ops: ThemeOp[] = [];

  // Animations.
  if (/(anim|mouvement|motion)/.test(m)) {
    if (/(supprime|enlève|retire|sans|désactive|coupe|remove|disable|turn off|no )/.test(m)) {
      ops.push({ op: "set_global", key: "motion_enabled", value: false });
      return { ops, reply: L("Animations désactivées sur tout le site (les contenus s'affichent directement).", "Animations turned off across the site (content shows immediately).") };
    }
    if (/(réduis|réduire|moins|calme|discr|doux|reduce|less|fewer|subtle)/.test(m)) {
      ops.push({ op: "set_global", key: "motion_enabled", value: true }, { op: "set_global", key: "motion_intensity", value: "subtle" }, { op: "set_global", key: "motion_parallax", value: false });
      return { ops, reply: L("Animations réduites : apparitions discrètes, plus d'effet de profondeur.", "Animations reduced: subtle reveals, no more depth effect.") };
    }
    if (/(plus|davantage|augmente|more|increase)/.test(m)) {
      ops.push({ op: "set_global", key: "motion_enabled", value: true }, { op: "set_global", key: "motion_intensity", value: "expressive" });
      return { ops, reply: L("Animations plus marquées (toujours coupées pour les visiteurs qui demandent moins de mouvement).", "Stronger animations (still turned off for visitors who ask for reduced motion).") };
    }
  }

  // Typographie.
  if (/(typo|police|font|caractères)/.test(m) && /(change|autre|nouvelle|modifie|different|another|switch)/.test(m)) {
    if (spec.meta?.v2?.art?.typography?.source === "brand-locked") return { ops: [], reply: L("Vos typographies ont été validées : je ne les change pas automatiquement. Modifiez-les dans l'onglet Marque si vous le souhaitez.", "Your fonts were approved: I won't change them automatically. Change them in the Brand tab if you wish.") };
    const cur = String(spec.settings.type_heading_font ?? "");
    const i = TYPE_PAIRINGS.findIndex((p) => p.heading === cur);
    const next = TYPE_PAIRINGS[(i + 1) % TYPE_PAIRINGS.length];
    ops.push({ op: "set_global", key: "type_heading_font", value: next.heading }, { op: "set_global", key: "type_body_font", value: next.body });
    return { ops, reply: L(`Typographies remplacées : ${next.label}. Redemandez pour voir l'association suivante, ou revenez en arrière.`, `Fonts replaced: ${next.label}. Ask again for the next pairing, or go back.`) };
  }

  // Disposition d'une section (désignée, ou nommée).
  if (/(disposition|mise en page|composition|présentation|layout|arrangement)/.test(m)) {
    const wantHero = /(ouverture|hero|héros|bannière|haut de page|banner)/.test(m);
    const types = wantHero ? ["v2-hero"] : /(appel final|appel à l'action|\bcta\b|call to action|final)/.test(m) ? ["v2-cta"] : /(galerie|images|photos|gallery)/.test(m) ? ["v2-media"] : /(en détail|détail|image et texte|detail)/.test(m) ? ["v2-split"] : /(bénéfice|atout|prestation|service|liste|carte|menu|offre|fonctionnalit|benefit|feature|list)/.test(m) ? ["v2-index"] : /(étape|méthode|step|process)/.test(m) ? ["v2-steps"] : /(question|faq)/.test(m) ? ["v2-faq"] : Object.keys(LAYOUTS).concat("v2-hero");
    const hit = findSection(spec, selection, types);
    if (!hit) return null;
    if (hit.s.type === "v2-hero") {
      const has = !!hit.s.settings.image_asset;
      const opts = has ? (spec.meta?.v2?.site === "saas" ? ["frame", "split"] : ["split", "stage", "type"]) : ["type", "board"];
      const cur = String(hit.s.settings.layout ?? opts[0]);
      const next = opts[(opts.indexOf(cur) + 1) % opts.length];
      ops.push({ op: "set_setting", template: hit.template, section: hit.id, key: "layout", value: next });
      return { ops, reply: L(`Ouverture recomposée (${next}). Redemandez pour la composition suivante.`, `Hero recomposed (${next}). Ask again for the next composition.`) };
    }
    const list = LAYOUTS[hit.s.type];
    if (!list) return null;
    const cur = String(hit.s.settings.layout ?? list[0]);
    const next = list[(list.indexOf(cur) + 1) % list.length];
    ops.push({ op: "set_setting", template: hit.template, section: hit.id, key: "layout", value: next });
    return { ops, reply: L(`Disposition changée (${next}) — cette section seulement.`, `Layout changed (${next}) — this section only.`) };
  }

  // Ouverture plus haut de gamme, sans IA : plus d'air, matière retirée, produit en scène si un détouré existe.
  if (/(premium|haut de gamme|luxe|élégant|elegant|upscale)/.test(m) && /(ouverture|hero|héros|bannière|banner|haut)/.test(m)) {
    const hit = findSection(spec, selection, ["v2-hero"]);
    if (!hit) return null;
    ops.push({ op: "set_setting", template: hit.template, section: hit.id, key: "padding_top", value: 120 }, { op: "set_setting", template: hit.template, section: hit.id, key: "padding_bottom", value: 144 }, { op: "set_setting", template: hit.template, section: hit.id, key: "texture", value: "none" });
    ops.push({ op: "set_global", key: "ds_density", value: "airy" });
    return { ops, reply: L("Ouverture plus aérée et plus sobre (marges élargies, matière retirée, densité aérée). Pour une refonte créative du texte ou de l'image, l'IA peut le faire avec votre accord.", "Hero made airier and more restrained (wider spacing, texture removed, airy density). For a creative rewrite of the copy or image, AI can do it with your approval.") };
  }

  // Ajouts : sections V2 (avec contenu de départ à compléter, jamais inventé).
  if (/(ajoute|ajouter|insère|\badd\b|insert)/.test(m)) {
    const add: [RegExp, string, Record<string, unknown>, { type: string; settings: Record<string, string> }[]][] = [
      [/faq|questions/, "v2-faq", { layout: "side", heading: L("Questions fréquentes", "Frequently asked questions") }, [{ type: "question", settings: { question: L("[À compléter : question]", "[To complete: question]"), answer: L("<p>[À compléter : réponse vérifiée]</p>", "<p>[To complete: verified answer]</p>") } }]],
      [/étape|méthode|déroulé|step|process/, "v2-steps", { layout: "line", heading: L("Comment ça se passe", "How it works") }, [1, 2, 3].map((n) => ({ type: "step", settings: { title: L(`[À compléter : étape ${n}]`, `[To complete: step ${n}]`), text: "" } }))],
      [/infos? pratiques|horaires|coordonnées|practical|hours/, "v2-facts", { layout: "grid", heading: L("Informations pratiques", "Practical information") }, [{ type: "fact", settings: { label: L("Horaires", "Hours"), value: L("[À compléter]", "[To complete]") } }]],
      [/appel final|appel à l'action|\bcta\b|call to action/, "v2-cta", { layout: "card", heading: L("[À compléter : titre]", "[To complete: heading]") }, []],
    ];
    const hit = add.find(([re]) => re.test(m));
    if (hit) {
      ops.push({ op: "add_section", template: selection?.template ?? "index", type: hit[1], settings: hit[2] as Record<string, string>, blocks: hit[3], position: selection ? { after: selection.section } : undefined });
      return { ops, reply: L("Section ajoutée au style du site, avec un contenu de départ « [À compléter] » à remplir (rien n'est inventé).", "Section added in the site's style, with “[To complete]” starter content to fill in (nothing is made up).") };
    }
  }
  return null;
}
