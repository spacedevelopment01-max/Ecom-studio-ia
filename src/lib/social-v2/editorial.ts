/**
 * Structure éditoriale HEBDOMADAIRE du calendrier (Autopilot V2) : chaque jour a un objectif (lundi présentation,
 * mardi conseils, mercredi bénéfices, jeudi coulisses, vendredi FAQ, samedi vente, dimanche communauté), une
 * publication principale et quatre publications complémentaires RÉELLEMENT différentes (pas des reformulations).
 *  - 1 publication par jour : la principale ;
 *  - 3 par jour : principale + un contenu informatif/démonstratif + un contenu d'engagement ou de conversion
 *    (selon l'objectif du client) ;
 *  - 5 par jour : principale + les quatre complémentaires du jour.
 * Chaque rôle a ses tournures (jamais de faux avis, de fausse promotion, de faux chantier ni d'équipe inventée) et
 * puise dans la matière VÉRIFIÉE du projet ; sans matière, la publication porte un « [À compléter : …] » précis.
 * La rotation d'une semaine à l'autre vient de la mémoire éditoriale (`memory.ts`) : produit présenté, matière et
 * tournure avancent à chaque passage.
 */
import type { Atom, Tpl } from "./copy";
import { fold } from "../seo-v2/lang";
import type { Objective, Pillar } from "./strategy";
import type { PostFormat } from "./platforms";

export type Goal = "awareness" | "sales" | "community" | "balanced";
export const GOALS: Goal[] = ["awareness", "sales", "community", "balanced"];
export type RoleKind = "main" | "info" | "demo" | "more" | "engage" | "convert";

export type Role = {
  id: string;
  /** Jour de la semaine (0 = dimanche … 6 = samedi). */
  day: number;
  kind: RoleKind;
  title: { fr: string; en: string };
  /** Pilier technique (matière à utiliser, objectif marketing). */
  pillarId: string;
  objective: Objective;
  formats: PostFormat[];
  idea: { fr: string; en: string };
  /** Produit présenté : celui de la semaine (0) ou le suivant (1). */
  item?: 0 | 1;
  tpls: { fr: Tpl[]; en: Tpl[] };
};

export type DayTheme = { day: number; id: string; title: { fr: string; en: string }; goal: { fr: string; en: string }; roles: Role[] };

const fold2 = (s: string) => fold(s).replace(/[^a-z0-9]/g, "");
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const low = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const strip = (s: string) => s.trim().replace(/[.!?\s]+$/, "");
const short = (s: string, n = 40) => {
  const t = cap(strip(s));
  if (t.length <= n) return t;
  const cut = t.slice(0, n + 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 8)).replace(/\s+(de|des|du|la|le|les|et|à|au|en|pour|of|the|and|to)$/i, "");
};
/** Nom d'un produit ou d'une prestation : jamais mis en minuscule (« Sérum Éclat », « Mâcon »). */
const nm = (x: Atom) => (x.kind === "item" || x.kind === "offer" ? strip(x.a) : low(strip(x.a)));
/** Valeur confirmée (souvent un nom propre ou une mesure) : telle quelle. */
/** « de » élidé devant une voyelle ou un h muet (« d'Enduits », « de Sérum »). */
const de = (s: string) => (/^[aeiouyhéèêàâîôûœ]/i.test(s.trim()) ? `d'${s.trim()}` : `de ${s.trim()}`);
const val = (x: Atom) => strip(x.b ?? x.a);
/** Vraie question (matière « q ») : mise en forme avec un seul point d'interrogation. */
const isQ = (x: Atom) => x.kind === "q" || /\?\s*$/.test(x.a) || /^(comment|pourquoi|quel|quelle|quels|quelles|combien|où|quand|faut-il|peut-on|how|why|what|which|when)\b/i.test(x.a.trim()) || /:\s*(comment|pourquoi|quel(le)?s?|combien)\b/i.test(x.a);
const q = (x: Atom) => `${cap(strip(x.a))} ?`;
const body = (x: Atom, fr: string, en: string, lang: "fr" | "en") => (x.b ? `${cap(strip(x.b))}.` : lang === "en" ? `[To complete: ${en}]` : `[À compléter : ${fr}]`);

/** Tournures d'un rôle (FR / EN). Chaque fonction reçoit une matière vérifiée et ne fait que la mettre en forme. */
type T = { fr: Tpl[]; en: Tpl[] };
export const BANKS: Record<string, T> = {
  presentation: {
    fr: [
      (x, c) => ({ hook: fold2(x.a) === fold2(c.brand) ? `Découvrez ${strip(x.a)}.` : `${cap(strip(x.a))}, signé ${c.brand}.`, body: body(x, "ce que c'est, en une phrase", "what it is, in one sentence", "fr"), headline: short(x.a) }),
      (x) => ({ hook: `On vous présente : ${nm(x)}.`, body: body(x, "à qui il s'adresse", "who it is for", "fr"), headline: short(x.a) }),
      (x, c) => ({ hook: fold2(x.a) === fold2(c.brand) ? `Vous connaissez ${strip(x.a)} ?` : `Vous connaissez ${nm(x)} ${de(c.brand)} ?`, body: body(x, "ce qu'il apporte", "what it brings", "fr"), headline: short(x.a) }),
      (x) => ({ hook: `Gros plan sur ${nm(x)}.`, body: body(x, "ses points forts confirmés", "its confirmed strengths", "fr"), headline: short(x.a) }),
    ],
    en: [
      (x, c) => ({ hook: fold2(x.a) === fold2(c.brand) ? `Discover ${strip(x.a)}.` : `${cap(strip(x.a))}, by ${c.brand}.`, body: body(x, "", "what it is, in one sentence", "en"), headline: short(x.a) }),
      (x) => ({ hook: `Meet ${strip(x.a)}.`, body: body(x, "", "who it is for", "en"), headline: short(x.a) }),
    ],
  },
  problem: {
    fr: [
      (x) => ({ hook: `Le problème que l'on règle : ${low(strip(x.a))}.`, body: "", headline: short(x.a) }),
      (x) => ({ hook: `${cap(strip(x.a))} ? Il existe une solution.`, body: "[À compléter : comment votre offre y répond, sans promesse]", headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: `The problem we solve: ${low(strip(x.a))}.`, body: "", headline: short(x.a) })],
  },
  benefit: {
    fr: [
      (x) => ({ hook: x.b ? `${cap(strip(x.a))} : ${val(x)}.` : `${cap(strip(x.a))}, concrètement.`, body: "", headline: short(x.b ?? x.a) }),
      (x) => ({ hook: `Le vrai avantage : ${x.b ? `${low(strip(x.a))}, ${val(x)}` : low(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) }),
      (x, c) => ({ hook: `Ce que ${c.offer} vous apporte : ${x.b ? `${low(strip(x.a))} (${val(x)})` : low(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) }),
    ],
    en: [(x) => ({ hook: `The real benefit: ${x.b ? `${low(strip(x.a))}, ${val(x)}` : low(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) })],
  },
  zoom: {
    fr: [
      (x) => ({ hook: x.b && x.b !== x.a ? `Zoom sur un détail : ${low(strip(x.a))}, ${val(x)}.` : `Zoom sur un détail : ${low(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) }),
      (x) => ({ hook: x.b && x.b !== x.a ? `On regarde de près : ${low(strip(x.a))} — ${val(x)}.` : `On regarde de près : ${low(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) }),
      (x) => ({ hook: x.b && x.b !== x.a ? `Un détail qui compte : ${low(strip(x.a))}, ${val(x)}.` : `Un détail qui compte : ${low(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) }),
    ],
    en: [(x) => ({ hook: `Close-up on a detail: ${low(strip(x.a))}${x.b && x.b !== x.a ? `, ${val(x)}` : ""}.`, body: "", headline: short(x.b ?? x.a) })],
  },
  other: {
    fr: [
      (x) => ({ hook: `Et si vous découvriez aussi ${nm(x)} ?`, body: body(x, "ce qui le distingue", "what sets it apart", "fr"), headline: short(x.a) }),
      (x) => ({ hook: `À côté, il y a aussi : ${nm(x)}.`, body: body(x, "pour qui il est fait", "who it is made for", "fr"), headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: `Have you also seen ${strip(x.a)}?`, body: body(x, "", "what sets it apart", "en"), headline: short(x.a) })],
  },
  advice: {
    fr: [
      (x) => (isQ(x) ? { hook: `Conseil du jour — ${q(x)}`, body: body(x, "votre conseil en deux phrases", "your tip in two sentences", "fr"), headline: short(x.a) } : { hook: `Notre conseil du jour : ${low(strip(x.a))}.`, body: body(x, "le conseil en deux phrases", "the tip in two sentences", "fr"), headline: short(x.a) }),
      (x) => (isQ(x) ? { hook: `${q(x)} Voici notre conseil.`, body: body(x, "votre conseil", "your tip", "fr"), headline: short(x.a) } : { hook: `Astuce : ${low(strip(x.a))}.`, body: body(x, "comment faire, étape par étape", "how to do it, step by step", "fr"), headline: short(x.a) }),
      (x) => (isQ(x) ? { hook: `On vous aide : ${low(strip(x.a))} ?`, body: body(x, "le geste ou le critère à retenir", "the habit or criterion to remember", "fr"), headline: short(x.a) } : { hook: `Un conseil simple : ${low(strip(x.a))}.`, body: body(x, "le geste à adopter", "the habit to adopt", "fr"), headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: isQ(x) ? `Tip of the day — ${q(x)}` : `Today's tip: ${low(strip(x.a))}.`, body: body(x, "", "the tip in two sentences", "en"), headline: short(x.a) })],
  },
  mistake: {
    fr: [
      (x) => ({ hook: isQ(x) ? `${q(x)} L'erreur fréquente à éviter.` : `L'erreur fréquente à éviter : ${low(strip(x.a))}.`, body: "[À compléter : l'erreur que vous voyez souvent et comment l'éviter]", headline: short(`À éviter : ${x.a}`) }),
      (x) => ({ hook: isQ(x) ? `${q(x)} Ce qu'il ne faut pas faire.` : `Ce qu'il ne faut pas faire : ${low(strip(x.a))}.`, body: "[À compléter : votre explication]", headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: isQ(x) ? `${q(x)} The common mistake to avoid.` : `The common mistake to avoid: ${low(strip(x.a))}.`, body: "[To complete: the mistake you often see and how to avoid it]", headline: short(x.a) })],
  },
  guide: {
    fr: [
      (x) => ({ hook: isQ(x) ? `${q(x)} Le mini-guide en 3 étapes.` : `Mini-guide : ${low(strip(x.a))} en 3 étapes.`, body: "[À compléter : les trois étapes]", headline: short(`Mini-guide : ${x.a}`) }),
      (x) => ({ hook: isQ(x) ? `${q(x)} Le guide express.` : `Le guide express : ${low(strip(x.a))}.`, body: "[À compléter : les points clés]", headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: isQ(x) ? `${q(x)} A 3-step mini-guide.` : `Mini-guide: ${low(strip(x.a))} in 3 steps.`, body: "[To complete: the three steps]", headline: short(x.a) })],
  },
  ask: {
    fr: [
      (x) => ({ hook: isQ(x) ? `${q(x)} Et vous, comment faites-vous ?` : `Et vous, que pensez-vous de ${low(strip(x.a))} ?`, body: "Dites-le-nous en commentaire.", headline: short(x.a) }),
      (x) => ({ hook: isQ(x) ? `${q(x)} Partagez votre expérience.` : `Une question sur ${low(strip(x.a))} ? Posez-la en commentaire.`, body: "", headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: isQ(x) ? `${q(x)} How do you handle it?` : `What do you think about ${low(strip(x.a))}?`, body: "Tell us in the comments.", headline: short(x.a) })],
  },
  usecase: {
    fr: [
      (x) => ({ hook: isQ(x) ? `${q(x)} Un exemple concret.` : `Un cas d'utilisation : ${low(strip(x.a))}.`, body: body(x, "le contexte et le résultat observé", "the context and the observed result", "fr"), headline: short(x.a) }),
      (x) => ({ hook: isQ(x) ? `${q(x)} En situation, ça donne quoi ?` : `En situation : ${low(strip(x.a))}.`, body: body(x, "un exemple réel", "a real example", "fr"), headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: isQ(x) ? `${q(x)} A concrete example.` : `A use case: ${low(strip(x.a))}.`, body: body(x, "", "the context and the observed result", "en"), headline: short(x.a) })],
  },
  compare: {
    fr: [(x) => ({ hook: x.b && x.b !== x.a ? `Comparer, preuves à l'appui : ${low(strip(x.a))}, ${val(x)}.` : `Comparer, preuves à l'appui : ${low(strip(x.a))}.`, body: "[À compléter : l'élément de comparaison, sans dénigrer personne]", headline: short(x.b ?? x.a) })],
    en: [(x) => ({ hook: `Compared, facts only: ${low(strip(x.a))}${x.b && x.b !== x.a ? `, ${val(x)}` : ""}.`, body: "[To complete: the comparison point, without criticising anyone]", headline: short(x.b ?? x.a) })],
  },
  craft: {
    fr: [
      (x) => ({ hook: `Notre savoir-faire : ${nm(x)}.`, body: body(x, "comment vous travaillez, en deux phrases", "how you work, in two sentences", "fr"), headline: short(x.a) }),
      (x) => ({ hook: `Comment on s'y prend : ${nm(x)}.`, body: body(x, "les étapes réelles", "the real steps", "fr"), headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: `Our know-how: ${strip(x.a)}.`, body: body(x, "", "how you work, in two sentences", "en"), headline: short(x.a) })],
  },
  materials: {
    fr: [
      (x) => ({ hook: x.b && x.b !== x.a ? `Matières et outils : ${low(strip(x.a))}, ${val(x)}.` : `Matières et outils : ${low(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) }),
      (x) => ({ hook: x.b && x.b !== x.a ? `De quoi c'est fait ? ${cap(strip(x.a))} : ${val(x)}.` : `De quoi c'est fait ? ${cap(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) }),
    ],
    en: [(x) => ({ hook: `Materials and tools: ${low(strip(x.a))}${x.b && x.b !== x.a ? `, ${val(x)}` : ""}.`, body: "", headline: short(x.b ?? x.a) })],
  },
  story: {
    fr: [
      (x, c) => ({ hook: `Pourquoi ${c.brand} ? ${cap(strip(x.a))}.`, body: "", headline: short(x.a) }),
      (x) => ({ hook: `Ce qui nous guide : ${low(strip(x.a))}.`, body: "", headline: short(x.a) }),
    ],
    en: [(x, c) => ({ hook: `Why ${c.brand}? ${cap(strip(x.a))}.`, body: "", headline: short(x.a) })],
  },
  faq: {
    fr: [
      (x) => ({ hook: `Question fréquente : ${isQ(x) ? `${low(strip(x.a))} ?` : `${low(strip(x.a))}.`}`, body: body(x, "votre réponse", "your answer", "fr"), headline: short(x.a) }),
      (x) => ({ hook: `On nous demande souvent : ${isQ(x) ? `${low(strip(x.a))} ?` : `${low(strip(x.a))}.`}`, body: body(x, "votre réponse en deux phrases", "your two-sentence answer", "fr"), headline: short(x.a) }),
      (x) => ({ hook: isQ(x) ? `${q(x)} On vous répond.` : `${cap(strip(x.a))} : on vous répond.`, body: body(x, "votre réponse", "your answer", "fr"), headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: `FAQ: ${low(strip(x.a))}${isQ(x) ? "?" : "."}`, body: body(x, "", "your answer", "en"), headline: short(x.a) })],
  },
  myth: {
    fr: [
      (x) => ({ hook: isQ(x) ? `${q(x)} Une idée reçue à corriger.` : `Idée reçue : ${low(strip(x.a))}.`, body: body(x, "l'idée reçue et la réalité", "the misconception and the reality", "fr"), headline: short(x.a) }),
      (x) => ({ hook: isQ(x) ? `${q(x)} Vrai ou faux ?` : `Vrai ou faux : ${low(strip(x.a))} ?`, body: body(x, "la bonne réponse", "the right answer", "fr"), headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: isQ(x) ? `${q(x)} A misconception to fix.` : `Misconception: ${low(strip(x.a))}.`, body: body(x, "", "the misconception and the reality", "en"), headline: short(x.a) })],
  },
  technical: {
    fr: [
      (x) => ({ hook: x.b && x.b !== x.a ? `En pratique : ${low(strip(x.a))}, ${val(x)}.` : `En pratique : ${low(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) }),
      (x) => ({ hook: x.b && x.b !== x.a ? `Le point technique : ${low(strip(x.a))} — ${val(x)}.` : `Le point technique : ${low(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) }),
    ],
    en: [(x) => ({ hook: `In practice: ${low(strip(x.a))}${x.b && x.b !== x.a ? `, ${val(x)}` : ""}.`, body: "", headline: short(x.b ?? x.a) })],
  },
  choose: {
    fr: [
      (x) => ({ hook: `Bien choisir : regardez d'abord ${low(strip(x.a))}${x.b && x.b !== x.a ? ` (${val(x)})` : ""}.`, body: "[À compléter : les autres critères qui comptent]", headline: short(x.a) }),
      (x) => ({ hook: `Le critère à vérifier : ${low(strip(x.a))}${x.b && x.b !== x.a ? `, ${val(x)}` : ""}.`, body: "", headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: `Choosing well: start with ${low(strip(x.a))}${x.b && x.b !== x.a ? ` (${val(x)})` : ""}.`, body: "[To complete: the other criteria that matter]", headline: short(x.a) })],
  },
  objection: {
    fr: [(x) => ({ hook: `« ${cap(strip(x.a))} » — on vous répond franchement.`, body: body(x, "votre réponse", "your answer", "fr"), headline: short(x.a) })],
    en: [(x) => ({ hook: `"${cap(strip(x.a))}" — an honest answer.`, body: body(x, "", "your answer", "en"), headline: short(x.a) })],
  },
  sell: {
    fr: [
      (x, c) => ({ hook: c.f.business === "services" ? `${cap(strip(x.a))} : parlons de votre projet.` : c.f.price ? `${strip(x.a)} : ${c.f.price}.` : `${strip(x.a)} est disponible.`, body: body(x, "ce qui le rend intéressant", "what makes it worthwhile", "fr"), headline: short(x.a) }),
      (x, c) => ({ hook: c.f.business === "services" ? `Besoin ${de(nm(x))} ? On vous fait un devis.` : `Envie ${de(nm(x))} ?${c.f.price ? ` ${c.f.price}.` : ""}`, body: "", headline: short(x.a) }),
      (x, c) => ({ hook: c.f.business === "services" ? `${cap(strip(x.a))} : votre projet commence par un échange.` : `À découvrir sur notre boutique : ${nm(x)}.`, body: "", headline: short(x.a) }),
    ],
    en: [(x, c) => ({ hook: c.f.business === "services" ? `${cap(strip(x.a))}: let's talk about your project.` : c.f.price ? `${strip(x.a)}: ${c.f.price}.` : `${strip(x.a)} is available.`, body: body(x, "", "what makes it worthwhile", "en"), headline: short(x.a) })],
  },
  reason: {
    fr: [
      (x) => ({ hook: `Une bonne raison de le choisir : ${x.b ? `${low(strip(x.a))}, ${val(x)}` : low(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) }),
      (x) => ({ hook: `Pourquoi le choisir ? ${cap(strip(x.a))}${x.b ? ` : ${val(x)}` : ""}.`, body: "", headline: short(x.b ?? x.a) }),
    ],
    en: [(x) => ({ hook: `A good reason to choose it: ${x.b ? `${low(strip(x.a))}, ${val(x)}` : low(strip(x.a))}.`, body: "", headline: short(x.b ?? x.a) })],
  },
  cta: {
    fr: [
      (_x, c) => ({ hook: c.f.business === "services" ? `Un projet ? Demandez votre devis.` : `${c.offer} est disponible sur notre boutique.`, body: "", headline: short(c.offer) }),
      (_x, c) => ({ hook: c.f.business === "services" ? `Parlons de votre projet : on vous répond.` : `Pour commander ${c.offer}, c'est par ici.`, body: "", headline: short(c.offer) }),
      (_x, c) => ({ hook: c.f.business === "services" ? `Votre devis, sans engagement : écrivez-nous.` : `${c.offer} : le lien est dans notre profil.`, body: "", headline: short(c.offer) }),
    ],
    en: [(_x, c) => ({ hook: c.f.business === "services" ? `A project? Ask for a quote.` : `${c.offer} is available in our store.`, body: "", headline: short(c.offer) })],
  },
  community: {
    fr: [
      (x, c) => (x.kind === "brand" ? { hook: `Votre avis nous intéresse : qu'aimeriez-vous voir chez ${c.brand} ?`, body: "Répondez en commentaire.", headline: short(c.brand) } : { hook: isQ(x) ? `${q(x)} Votre avis en commentaire.` : `Question à notre communauté : ${low(strip(x.a))}, vous en pensez quoi ?`, body: "", headline: short(x.a) }),
      (x, c) => (x.kind === "brand" ? { hook: `Qu'est-ce qui compte le plus pour vous quand vous choisissez ${c.f.category ? low(c.f.category) : "un produit comme le nôtre"} ?`, body: "Dites-le-nous en commentaire.", headline: short(c.brand) } : { hook: isQ(x) ? `On en parle ? ${q(x)}` : `On en parle : ${low(strip(x.a))}.`, body: "Répondez en commentaire.", headline: short(x.a) }),
    ],
    en: [(x, c) => ({ hook: x.kind === "brand" ? `Your opinion matters: what would you like to see from ${c.brand}?` : isQ(x) ? `${q(x)} Tell us in the comments.` : `Question for our community: what do you think about ${low(strip(x.a))}?`, body: "", headline: short(x.a) })],
  },
  poll: {
    fr: [
      (x) => ({ hook: `Petit sondage : plutôt ${strip(x.a)}${x.b ? ` ou ${strip(x.b)}` : " ou autre chose"} ?`, body: "Votez en commentaire.", headline: short(x.a) }),
      (x) => ({ hook: `Votre préféré : ${strip(x.a)}${x.b ? ` ou ${strip(x.b)}` : ""} ?`, body: "Dites-le-nous en commentaire.", headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: `Quick poll: ${strip(x.a)}${x.b ? ` or ${strip(x.b)}` : " or something else"}?`, body: "Vote in the comments.", headline: short(x.a) })],
  },
  recap: {
    fr: [
      (x) => ({ hook: isQ(x) ? `À retenir cette semaine — ${q(x)}` : `Le conseil à retenir cette semaine : ${low(strip(x.a))}.`, body: body(x, "le conseil en une phrase", "the tip in one sentence", "fr"), headline: short(x.a) }),
      (x) => ({ hook: isQ(x) ? `Récap de la semaine : ${low(strip(x.a))} ?` : `Récap de la semaine : ${low(strip(x.a))}.`, body: body(x, "l'essentiel en une phrase", "the key point in one sentence", "fr"), headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: isQ(x) ? `This week's takeaway — ${q(x)}` : `This week's key tip: ${low(strip(x.a))}.`, body: body(x, "", "the tip in one sentence", "en"), headline: short(x.a) })],
  },
  discuss: {
    fr: [
      (x, c) => (x.kind === "brand" ? { hook: `Sujet de discussion : comment utilisez-vous ${c.offer} ?`, body: "Partagez votre expérience en commentaire.", headline: short(c.offer) } : { hook: isQ(x) ? `Sujet de discussion — ${q(x)}` : `Sujet de discussion : ${low(strip(x.a))}.`, body: "Partagez votre expérience en commentaire.", headline: short(x.a) }),
    ],
    en: [(x) => ({ hook: isQ(x) ? `Let's talk — ${q(x)}` : `Let's talk about ${low(strip(x.a))}.`, body: "Share your experience in the comments.", headline: short(x.a) })],
  },
  teaser: {
    fr: [(x) => ({ hook: `La semaine prochaine, on vous parle ${de(nm(x))}.`, body: "Restez connectés.", headline: short(x.a) })],
    en: [(x) => ({ hook: `Next week, we'll talk about ${strip(x.a)}.`, body: "Stay tuned.", headline: short(x.a) })],
  },
};

const R = (day: number, kind: RoleKind, id: string, fr: string, en: string, pillarId: string, objective: Objective, formats: PostFormat[], bank: string, ideaFr: string, ideaEn: string, item?: 0 | 1): Role => ({ id: `${day}:${id}`, day, kind, title: { fr, en }, pillarId, objective, formats, idea: { fr: ideaFr, en: ideaEn }, item, tpls: BANKS[bank] });

/** Les sept jours : thème, objectif, publication principale et quatre complémentaires (ordre = priorité). */
export const WEEK: DayTheme[] = [
  { day: 1, id: "presentation", title: { fr: "Présentation", en: "Introduction" }, goal: { fr: "Faire découvrir un produit, un service ou une nouveauté", en: "Introduce a product, a service or something new" }, roles: [
    R(1, "main", "presentation", "Présentation", "Introduction", "item", "demonstrate", ["image", "carousel"], "presentation", "le produit ou la prestation présenté(e), avec une vraie photo", "the product or service, with a real photo", 0),
    R(1, "info", "problem", "Le problème résolu", "The problem it solves", "problem", "educate", ["image"], "problem", "le problème auquel votre offre répond", "the problem your offer solves"),
    R(1, "demo", "benefit", "L'avantage principal", "Main benefit", "demo", "demonstrate", ["image"], "benefit", "l'avantage principal, confirmé", "the main confirmed benefit"),
    R(1, "more", "zoom", "Zoom sur une caractéristique", "Close-up on a feature", "specs", "demonstrate", ["image", "carousel"], "zoom", "une caractéristique précise", "a specific feature"),
    R(1, "convert", "other", "Une autre offre", "Another offer", "item", "sell", ["image"], "other", "une autre offre disponible", "another available offer", 1),
  ] },
  { day: 2, id: "conseils", title: { fr: "Conseils et astuces", en: "Tips and tricks" }, goal: { fr: "Être utile et montrer son expertise", en: "Be useful and show expertise" }, roles: [
    R(2, "main", "advice", "Conseil", "Tip", "conseils", "educate", ["carousel", "image"], "advice", "un conseil sur votre produit ou service", "a tip about your product or service"),
    R(2, "info", "mistake", "Erreur fréquente", "Common mistake", "pedagogie", "educate", ["image"], "mistake", "une erreur fréquente à éviter", "a common mistake to avoid"),
    R(2, "more", "advice2", "Conseil supplémentaire", "Extra tip", "conseils", "educate", ["image"], "advice", "un autre conseil", "another tip"),
    R(2, "demo", "guide", "Mini-guide", "Mini-guide", "expertise", "educate", ["carousel"], "guide", "un mini-guide en 3 étapes", "a 3-step mini-guide"),
    R(2, "engage", "ask", "Question liée au conseil", "Question about the tip", "conseils", "engage", ["image"], "ask", "une question à poser à votre communauté", "a question for your community"),
  ] },
  { day: 3, id: "benefices", title: { fr: "Bénéfices et démonstrations", en: "Benefits and demos" }, goal: { fr: "Convaincre et expliquer la valeur de l'offre", en: "Convince and explain the value" }, roles: [
    R(3, "main", "benefit", "Bénéfice concret", "Concrete benefit", "demo", "demonstrate", ["image", "carousel"], "benefit", "un bénéfice concret et confirmé", "a concrete confirmed benefit"),
    R(3, "demo", "demo", "Démonstration", "Demonstration", "specs", "demonstrate", ["carousel", "image"], "zoom", "une démonstration avec une vraie photo", "a demonstration with a real photo"),
    R(3, "info", "usecase", "Cas d'utilisation", "Use case", "usages", "educate", ["image"], "usecase", "une situation d'utilisation réelle", "a real usage situation"),
    R(3, "more", "compare", "Comparaison factuelle", "Factual comparison", "specs", "educate", ["image"], "compare", "un élément de comparaison factuel", "a factual comparison point"),
    R(3, "convert", "hidden", "Caractéristique méconnue", "Lesser-known feature", "specs", "demonstrate", ["image"], "zoom", "une fonction moins connue", "a lesser-known feature"),
  ] },
  { day: 4, id: "coulisses", title: { fr: "Coulisses et savoir-faire", en: "Behind the scenes" }, goal: { fr: "Développer la confiance et valoriser l'entreprise", en: "Build trust" }, roles: [
    R(4, "main", "craft", "Savoir-faire", "Know-how", "savoir-faire", "brand", ["image", "carousel"], "craft", "votre savoir-faire, en vrai (photo réelle)", "your know-how, for real (real photo)"),
    R(4, "info", "process", "Processus", "Process", "none", "brand", ["carousel"], "craft", "vos vraies étapes de fabrication ou d'intervention", "your real making or service steps"),
    R(4, "demo", "materials", "Outils et matériaux", "Tools and materials", "specs", "educate", ["image"], "materials", "les outils ou matériaux utilisés", "the tools or materials used"),
    R(4, "more", "prep", "Préparation", "Preparation", "none", "brand", ["image"], "craft", "la préparation d'une commande ou d'une intervention (photo réelle)", "preparing an order or a job (real photo)"),
    R(4, "engage", "story", "Histoire et valeurs", "Story and values", "marque", "brand", ["image"], "story", "l'histoire ou les valeurs de la marque", "the brand's story or values"),
  ] },
  { day: 5, id: "faq", title: { fr: "FAQ et objections", en: "FAQ and objections" }, goal: { fr: "Rassurer avant une décision", en: "Reassure before a decision" }, roles: [
    R(5, "main", "faq", "Question fréquente", "Frequent question", "questions", "educate", ["image", "carousel"], "faq", "une question fréquente et votre réponse", "a frequent question and your answer"),
    R(5, "info", "myth", "Idée reçue", "Misconception", "questions", "educate", ["image"], "myth", "une idée reçue et la réalité", "a misconception and the reality"),
    R(5, "demo", "technical", "Explication technique", "Technical explanation", "specs", "educate", ["image"], "technical", "une explication technique simple", "a simple technical explanation"),
    R(5, "more", "choose", "Guide de choix", "Buying guide", "specs", "educate", ["carousel"], "choose", "les critères pour bien choisir", "the criteria to choose well"),
    R(5, "convert", "objection", "Réponse à une objection", "Answer to an objection", "objections", "convert", ["image"], "objection", "une objection fréquente et votre réponse", "a frequent objection and your answer"),
  ] },
  { day: 6, id: "vente", title: { fr: "Vente et conversion", en: "Sales and conversion" }, goal: { fr: "Encourager l'achat ou la prise de contact", en: "Encourage purchase or contact" }, roles: [
    R(6, "main", "sell", "Mise en avant commerciale", "Product spotlight", "item", "convert", ["image", "carousel"], "sell", "votre offre, avec son vrai prix s'il est confirmé", "your offer, with its confirmed price"),
    R(6, "demo", "reason", "Argument d'achat", "Reason to buy", "demo", "convert", ["image"], "reason", "un argument d'achat confirmé", "a confirmed reason to buy"),
    R(6, "info", "situation", "Mise en situation", "In context", "usages", "demonstrate", ["image"], "usecase", "une mise en situation réelle", "a real-life situation"),
    R(6, "more", "other", "Autre produit ou prestation", "Another product or service", "item", "sell", ["image"], "other", "un autre produit ou une autre prestation", "another product or service", 1),
    R(6, "convert", "cta", "Appel à l'action", "Call to action", "conversion", "convert", ["image"], "cta", "le lien vers la boutique, le devis ou la réservation", "the link to the store, quote or booking"),
  ] },
  { day: 0, id: "communaute", title: { fr: "Communauté et engagement", en: "Community and engagement" }, goal: { fr: "Fidéliser et encourager l'interaction", en: "Build loyalty and interaction" }, roles: [
    R(0, "main", "community", "Question à la communauté", "Question to the community", "community", "engage", ["image"], "community", "une question à votre communauté", "a question for your community"),
    R(0, "engage", "poll", "Sondage", "Poll", "items", "engage", ["image"], "poll", "un choix entre deux produits ou prestations", "a choice between two products or services"),
    R(0, "info", "recap", "Conseil récapitulatif", "Recap tip", "conseils", "educate", ["image"], "recap", "le conseil à retenir de la semaine", "the key tip of the week"),
    R(0, "more", "discuss", "Sujet de discussion", "Discussion topic", "community", "engage", ["image"], "discuss", "un sujet de discussion", "a discussion topic"),
    R(0, "demo", "teaser", "La semaine prochaine", "Next week", "item", "engage", ["image"], "teaser", "ce qui attend la communauté la semaine suivante", "what's coming next week", 1),
  ] },
];

export const dayTheme = (day: number) => WEEK.find((d) => d.day === day)!;

/**
 * Rôles d'une journée selon le rythme (1, 3 ou 5, et 2 ou 4 entre les deux) et l'objectif du client.
 * 3 par jour : principale + informatif/démonstratif + engagement (notoriété, communauté) ou conversion (ventes).
 * Un niveau commercial faible remplace les publications de conversion complémentaires par de l'engagement.
 */
export function rolesFor(day: number, perDay: number, goal: Goal = "balanced", commercial: 0 | 1 | 2 = 1): Role[] {
  const t = dayTheme(day);
  const [main, ...rest] = t.roles;
  const n = Math.max(1, Math.min(5, Math.round(perDay)));
  if (n === 1) return [main];
  const info = rest.find((r) => r.kind === "info" || r.kind === "demo")!;
  const wantsSale = goal === "sales" || (goal === "balanced" && commercial >= 1 && day >= 5);
  const closer = (wantsSale && commercial > 0 ? rest.find((r) => r.kind === "convert") : rest.find((r) => r.kind === "engage")) ?? rest.find((r) => r !== info)!;
  if (n === 3) return [main, info, closer === info ? rest.find((r) => r !== info)! : closer];
  // 5 (ou 2, 4) : la principale puis les complémentaires dans l'ordre du jour (2 : + l'informatif ; 4 : sans la dernière).
  let pool = [info, ...rest.filter((r) => r !== info)];
  if (commercial === 0) pool = [...pool.filter((r) => r.kind !== "convert"), ...pool.filter((r) => r.kind === "convert")];
  return [main, ...pool.slice(0, n - 1)];
}

/** Pilier technique d'un rôle (pour la matière, les formats et l'objectif marketing). */
export const roleAsPillar = (r: Role, lang: "fr" | "en"): Pillar => ({ id: r.id, title: r.title[lang], objective: r.objective, share: 1, formats: r.formats, idea: r.idea[lang] });

/** Jour de la semaine d'une date AAAA-MM-JJ (0 = dimanche). */
export const weekdayOf = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay();
/** Numéro de semaine absolu (lundi comme début de semaine) : sert à faire tourner les produits d'une semaine à l'autre. */
export const weekIndex = (ymd: string) => Math.floor((Date.parse(`${ymd}T12:00:00Z`) / 86_400_000 + 3) / 7);
