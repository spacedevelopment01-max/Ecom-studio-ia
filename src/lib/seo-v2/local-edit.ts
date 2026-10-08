/**
 * Retouches en conversation d'un document texte : la demande est comprise localement. Ce qui est simple et sûr
 * (raccourcir, supprimer, mettre en gras, remplacer un mot, ajouter une FAQ à partir des réponses connues,
 * recalculer un titre SEO) est fait SANS IA, gratuitement. Ce qui est créatif (changer le ton, rendre plus premium,
 * réécrire un paragraphe) passe par l'IA — limité aux blocs visés, jamais tout le document.
 */
import { fold, langPack } from "./lang";
import { blockText } from "./doc";
import { fit, seoTitle } from "./write";
import { META_DESC_TARGET } from "./doc";
import { END, type ContentOp } from "./ops";
import type { ContentBrief, ContentDoc, VerifiedFacts } from "./types";

export type EditPlan =
  | { kind: "local"; ops: ContentOp[]; summary: string }
  | { kind: "ai"; blockIds: string[]; instruction: string; summary: string; meta: boolean }
  | { kind: "unclear"; summary: string };

const CREATIVE = /ton|premium|haut de gamme|luxe|chaleureu|dynamique|convaincant|persuasi|percutant|reformul|reecri|rewrite|rephrase|tone|warmer|punchier|more (premium|persuasive)|ameliore|improve|plus (vendeur|naturel|simple|clair|court et|fluide)|traduis|translate|adapte|tono|reescribe|mejora/;

/**
 * Plan d'une retouche. `selected` : blocs choisis dans l'éditeur (portée de la demande) ; sans sélection, la
 * demande vise ce qu'elle nomme (titre SEO, description, FAQ) ou le document.
 */
export function planEdit(request: string, doc: ContentDoc, o: { selected?: string[]; facts?: VerifiedFacts; brief?: Pick<ContentBrief, "primaryKeyword" | "page" | "type"> } = {}): EditPlan {
  const t = fold(request).trim();
  const sel = (o.selected ?? []).filter((id) => doc.blocks.some((b) => b.id === id));
  const firstP = doc.blocks.find((b) => b.kind === "p");
  const target = sel.length ? sel : firstP ? [firstP.id] : [];

  // Titre SEO / méta-description : recalcul local (longueur visée, mot-clé, marque) — aucune IA.
  if (/titre seo|seo title|title tag|titulo seo/.test(t) && /optimis|raccourci|ameliore|shorten|optimi[sz]e|fix|corrige|acorta/.test(t) && o.facts && o.brief) {
    return { kind: "local", ops: [{ op: "set_meta", field: "seoTitle", value: seoTitle(o.brief, o.facts) }], summary: "titre SEO recalculé (mot-clé, marque, 60 caractères visés)" };
  }
  if (/meta|méta/.test(request.toLowerCase()) && /raccourci|shorten|acorta|trop long|too long/.test(t)) {
    return { kind: "local", ops: [{ op: "set_meta", field: "metaDescription", value: fit(doc.meta.metaDescription, META_DESC_TARGET) }], summary: "méta-description ramenée à 155 caractères" };
  }
  // Raccourcir : on garde les premières phrases entières (rien d'inventé, rien d'ajouté).
  if (/raccourci|plus court|shorten|make (it )?shorter|acorta|mas corto/.test(t) && !CREATIVE.test(t.replace(/raccourci\w*|plus court|shorten|acorta\w*/g, ""))) {
    if (!target.length) return { kind: "unclear", summary: "aucun paragraphe à raccourcir" };
    const ops: ContentOp[] = target.map((id) => {
      const b = doc.blocks.find((x) => x.id === id)!;
      const n = blockText(b).split(/\s+/).length;
      return { op: "shorten", blockId: id, maxWords: Math.max(8, Math.round(n * 0.6)) };
    });
    return { kind: "local", ops, summary: `${ops.length} bloc(s) raccourci(s) (premières phrases gardées)` };
  }
  // Supprimer le bloc choisi.
  if (/^(supprime|efface|enleve|retire|delete|remove|elimina|borra)\b/.test(t) && sel.length && !/mot|word|phrase/.test(t)) {
    return { kind: "local", ops: sel.map((id) => ({ op: "delete", blockId: id })), summary: `${sel.length} bloc(s) supprimé(s)` };
  }
  // Mettre en gras / italique un passage cité.
  const quoted = request.match(/[«"“]\s*([^»"”]+?)\s*[»"”]/)?.[1];
  if (quoted && /gras|bold|negrita/.test(t)) {
    const b = doc.blocks.find((x) => (sel.length ? sel.includes(x.id) : true) && blockText(x).includes(quoted));
    if (b) return { kind: "local", ops: [{ op: "bold", blockId: b.id, text: quoted }], summary: `« ${quoted} » en gras` };
  }
  if (quoted && /italique|italic|cursiva/.test(t)) {
    const b = doc.blocks.find((x) => (sel.length ? sel.includes(x.id) : true) && blockText(x).includes(quoted));
    if (b) return { kind: "local", ops: [{ op: "italic", blockId: b.id, text: quoted }], summary: `« ${quoted} » en italique` };
  }
  // Remplacer un mot : « remplace "X" par "Y" ».
  const rep = request.match(/(?:remplace|replace|cambia|reemplaza)\s+[«"“]([^»"”]+)[»"”]\s+(?:par|by|with|por)\s+[«"“]([^»"”]*)[»"”]/i);
  if (rep) return { kind: "local", ops: [{ op: "replace", find: rep[1], with: rep[2], blockId: sel.length === 1 ? sel[0] : null }], summary: `« ${rep[1]} » remplacé par « ${rep[2]} »` };
  // FAQ : à partir des réponses confirmées du client ; sinon des questions à compléter (jamais de réponse inventée).
  if (/ajoute (une )?faq|add (a )?faq|anade (una )?faq|ajoute des questions/.test(t) && o.facts) {
    const P = langPack(doc.lang);
    const have = new Set(doc.blocks.filter((b) => b.kind === "faq").map((b) => (b.kind === "faq" ? fold(b.q) : "")));
    const qa = [...o.facts.answers.map((a) => ({ q: a.q, a: a.a })), ...o.facts.objections.map((x) => ({ q: x.objection, a: x.answer }))].filter((x) => !have.has(fold(x.q)));
    // Ajout en fin de document, dans l'ordre : le titre puis les questions.
    const ops: ContentOp[] = [{ op: "insert", after: END, block: { kind: "h2", text: P.headings.faq } }];
    const items = qa.length ? qa : [{ q: P.unknown("question fréquente de vos clients"), a: P.unknown("votre réponse") }];
    return { kind: "local", ops: [...ops, ...items.map((x) => ({ op: "insert" as const, after: END, block: { kind: "faq" as const, q: x.q, a: x.a } }))], summary: qa.length ? `FAQ ajoutée (${qa.length} réponse(s) confirmée(s))` : "FAQ ajoutée, à compléter (aucune réponse confirmée connue)" };
  }
  // Créatif : IA, sur la portée demandée seulement.
  if (CREATIVE.test(t) || /reecris|rewrite|reescribe/.test(t)) {
    const onlyThis = /uniquement|seulement|only|solo|ce paragraphe|this paragraph|este parrafo/.test(t);
    const ids = sel.length ? sel : onlyThis ? target : doc.blocks.filter((b) => b.kind !== "h1").map((b) => b.id);
    return { kind: "ai", blockIds: ids, instruction: request.trim().slice(0, 400), summary: `réécriture par l'IA de ${ids.length} bloc(s)`, meta: /titre|title|meta/.test(t) };
  }
  return { kind: "unclear", summary: "demande non comprise : précisez le passage et la modification (ex. « raccourcis ce paragraphe »)" };
}
