/**
 * Le moteur local d'abord : quand une retouche de la boutique est simple et que le moteur local sait la faire
 * à coup sûr (couleur d'un élément ou d'une section, texte entre guillemets sur l'élément désigné, image
 * remplacée, section masquée / déplacée / supprimée, retour arrière…), il la fait lui-même, même si l'IA est
 * active : le résultat est identique et le client n'utilise aucun crédit IA.
 * Au moindre doute (demande composée, créative, élément ambigu, opération refusée), l'IA prend le relais.
 */
import { applyOps, type ThemeOp } from "../theme/ops";
import { containerOf, type ThemeSpec } from "../theme/spec";
import { REPLACE_INTENT, localMediaReplace, type MediaAttachment } from "../theme/image-target";
import { localThemeCommand } from "./local";
import { v2ThemeCommand } from "../theme-v2/local-edit";
import type { BusinessType } from "../project-types";

type Selection = { template: string; section: string; block?: string; kind?: string; path?: string; role?: string; text?: string; tag?: string; src?: string } | null | undefined;
export type LocalFirst = { ops: ThemeOp[]; reply: string; revert: boolean; direction?: string };

/** Plusieurs actions dans une même demande (« mets le titre en rouge et ajoute une FAQ »). */
const ACTIONS =
  /(?<![\p{L}\p{N}_])(mets|met|mettre|change|changer|modifie|modifier|ajoute|ajouter|insère|supprime|supprimer|retire|enlève|masque|cache|affiche|monte|remonte|descends|déplace|remplace|remplacer|agrandis|réduis|centre|aligne|écris|réécris|traduis|passe|add|remove|delete|hide|show|move|replace|change|make|put|set|write|rewrite|translate|resize|center|align)(?![\p{L}\p{N}_])/giu;
/** Demandes créatives ou de jugement : l'IA fait mieux. */
const CREATIVE =
  /(plus (moderne|pro|professionnel|élégant|chic|premium|vendeur|attractif|joli|beau|dynamique|sobre|lisible|impactant|percutant)|améliore|optimise|réécris|rédige|invente|propose|imagine|inspire|comme sur|comme le site|à la manière|dans le style de|harmonise|refais|redesign|more (modern|professional|elegant|premium|attractive)|improve|optimi[sz]e|rewrite|write me|come up with|inspired|like the site|in the style of|make it (look|feel))/i;

/** Demande courte et à une seule action. */
export function isSimpleRequest(message: string): boolean {
  const m = message.trim();
  if (m.length > 160 || /\n/.test(m)) return false;
  if (CREATIVE.test(m)) return false;
  // Les guillemets peuvent contenir n'importe quels mots : on ne compte que les verbes hors guillemets.
  const outside = m.replace(/[«"“][^»"”]*[»"”]/g, " ");
  if ((outside.match(ACTIONS) ?? []).length > 1) return false;
  if (/(;|\bpuis\b|\bensuite\b|\bthen\b|\balso\b|\baussi\b|\bet (aussi|ensuite|puis)\b)/i.test(outside)) return false;
  return true;
}

/**
 * Retouche que le moteur local fait avec certitude, ou null (l'IA s'en charge).
 * `mediaFile` : même résolution des médias que l'application réelle, pour vérifier à blanc que rien n'est refusé.
 */
export function localFirst(
  spec: ThemeSpec,
  message: string,
  selection: Selection,
  atts: MediaAttachment[],
  business: BusinessType,
  mediaFile: (assetId: string) => { filename: string } | null,
): LocalFirst | null {
  if (!isSimpleRequest(message)) return null;
  const sel = selection ?? null;
  // Pièce jointe sans demande explicite de remplacement (inspiration, capture d'exemple) : l'IA la regarde.
  if (atts.length && !REPLACE_INTENT.test(message)) return null;
  // Image désignée remplacée par l'image jointe : déterministe.
  const media = localMediaReplace(spec, message, sel, atts);
  if (media) return media.ops.length ? { ops: media.ops, reply: media.reply, revert: false } : null;
  // Une pièce jointe sans remplacement d'image (capture d'exemple, inspiration) : l'IA doit la regarder.
  if (atts.length) return null;
  // Site V2 : animations, typographie, disposition d'une section, sections V2 ajoutées — sans IA, vérifié à blanc.
  const v2 = v2ThemeCommand(spec, message, sel);
  if (v2) {
    if (!v2.ops.length) return null;
    const dryV2 = applyOps(spec, v2.ops, { targeted: new Set<string>(sel ? [`${sel.template}:${sel.section}`] : []), mediaFile });
    return dryV2.rejected.length || !dryV2.applied.length ? null : { ops: v2.ops, reply: v2.reply, revert: false };
  }
  const r = localThemeCommand(spec, message, sel, business);
  if (r.revert) return { ops: [], reply: r.reply, revert: true };
  if (r.direction) return { ops: [], reply: r.reply, revert: false, direction: r.direction };
  if (!r.ops.length) return null;
  const whole = !sel || sel.kind === "Section";
  for (const op of r.ops) {
    switch (op.op) {
      case "element_style":
      case "section_colors":
      case "set_scheme_color":
      case "use_media":
      case "add_block":
        break;
      // Supprimer / déplacer / masquer : seulement si c'est bien la section entière qui est désignée.
      case "remove_section":
      case "move_section":
      case "toggle_section":
        if (sel && !whole) return null;
        break;
      // Ajout d'une section « nue » : seulement pour une demande courte, sans précision de contenu.
      case "add_section":
        if (message.length > 70 || /\b(avec|contenant|qui|with|containing|that)\b/i.test(message)) return null;
        break;
      // Texte entre guillemets : seulement s'il remplace exactement le texte de l'élément désigné.
      case "set_setting": {
        if (op.key === "price_in_button") break;
        const c = sel ? containerOf(spec, sel.template) : null;
        const s = c?.sections[op.section];
        const target = op.block ? s?.blocks?.[op.block] : s;
        const current = String(target?.settings?.[op.key] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
        const shown = (sel?.text ?? "").replace(/\s+/g, " ").trim().toLowerCase();
        if (!current || !shown || current !== shown) return null;
        break;
      }
      default:
        return null;
    }
  }
  // Vérification à blanc : la moindre opération refusée → l'IA s'en charge.
  const targeted = new Set<string>(sel ? [`${sel.template}:${sel.section}`] : []);
  const dry = applyOps(spec, r.ops, { targeted, mediaFile });
  if (dry.rejected.length || !dry.applied.length) return null;
  return { ops: r.ops, reply: r.reply, revert: false };
}
