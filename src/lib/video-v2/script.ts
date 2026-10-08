/**
 * Script vidéo V2 : accroche → développement → démonstration ou argument → preuve disponible → conclusion → CTA.
 *
 * Version locale (gratuite, toujours écrite d'abord) à partir de la matière confirmée du projet ; version IA
 * facultative, contrôlée : phrases creuses, preuves, chiffres, avis ou certifications absents des faits confirmés
 * sont refusés (la version locale reprend la main). Une section « preuve » n'existe que s'il y a une preuve.
 */
import { z } from "zod";
import type { AdInsight } from "../ads-v2/types";
import { spokenUsage } from "./strategy";
import type { CreativeStrategy, NarrativeStyle, ScriptPart, ScriptSection, VideoIntent, VideoScript } from "./types";

/** Débit de parole naturel (mots par seconde) : la voix ne dépasse jamais la durée de sa section. */
export const WORDS_PER_SECOND = 2.4;

/** Répartition de la durée entre les parties (normalisée selon les parties présentes). */
const SHARE: Record<ScriptPart, number> = { hook: 0.12, development: 0.24, demonstration: 0.26, proof: 0.13, conclusion: 0.1, cta: 0.15 };

/** Formules creuses : refusées dans un script (elles ne disent rien de vrai sur le projet). */
const HOLLOW = [
  /r[ée]volutionn/i,
  /incroyable/i,
  /\ble meilleur\b|\bthe best\b/i,
  /ne cherchez plus|look no further/i,
  /game[- ]changer/i,
  /qualit[ée] sup[ée]rieure|superior quality/i,
  /unique en son genre|one of a kind/i,
  /vous allez adorer|you(?:'| wi)ll love/i,
  /transforme[rz]? votre vie|change your life/i,
  /dans un monde o[uù]|in a world where/i,
  /plus jamais|never again/i,
];

/** Affirmations qui exigent une preuve confirmée (sinon : inventées). */
const NEEDS_PROOF = [
  { re: /\d+\s?%/, what: "pourcentage" },
  { re: /\b(certifi|homologu|approuv|label|bio\b|organic|dermatolog|clinique|clinically|test[ée] sous)/i, what: "certification ou test" },
  { re: /(?<!\p{L})(avis|[ée]toiles|stars|reviews?|clientes? satisfaites?|clients? satisfaits?|satisfied customers|recommand[ée]e? par)/iu, what: "avis ou témoignage" },
  { re: /\b(n°\s?1|numéro un|number one|leader|best[- ]seller)/i, what: "classement" },
  { re: /\b(garanti[es]?|guarantee)/i, what: "garantie" },
  { re: /\b(prouv|proven|r[ée]sultats? (visibles|garantis)|en \d+ jours)/i, what: "résultat" },
  { re: /\b\d{2,}\s?(000|k)?\s?(clients|ventes|utilisateurs|users|sold)/i, what: "chiffre de ventes ou de clients" },
];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Défauts d'un script : formules creuses, affirmations non confirmées, durée de voix impossible, CTA absent. */
export function scriptIssues(sections: ScriptSection[], material: { proofs: string[]; facts: { label: string; value: string }[]; claimsToAvoid?: string[] }): string[] {
  const issues: string[] = [];
  const known = fold([...material.proofs, ...material.facts.map((f) => `${f.label} ${f.value}`)].join(" "));
  for (const s of sections) {
    const text = `${s.voice} ${s.onScreen}`;
    for (const h of HOLLOW) if (h.test(text)) issues.push(`${s.part} : formule creuse (« ${text.match(h)![0]} »)`);
    for (const n of NEEDS_PROOF) {
      const m = text.match(n.re);
      if (!m) continue;
      // Acceptée seulement si l'élément figure dans les faits ou preuves confirmés.
      const token = fold(m[0]).replace(/\s+/g, " ").trim();
      if (!known.includes(token)) issues.push(`${s.part} : ${n.what} non confirmé (« ${m[0]} »)`);
    }
    for (const avoid of material.claimsToAvoid ?? []) if (avoid.trim() && fold(text).includes(fold(avoid))) issues.push(`${s.part} : affirmation à éviter (« ${avoid} »)`);
    const words = s.voice.trim() ? s.voice.trim().split(/\s+/).length : 0;
    if (words > Math.ceil(s.durationS * WORDS_PER_SECOND) + 1) issues.push(`${s.part} : voix trop longue pour ${s.durationS} s (${words} mots)`);
  }
  if (!sections.some((s) => s.part === "hook")) issues.push("pas d'accroche d'ouverture");
  if (!sections.some((s) => s.part === "cta" && (s.onScreen.trim() || s.voice.trim()))) issues.push("pas d'appel à l'action");
  return [...new Set(issues)];
}

/** Coupe une phrase au nombre de mots que la durée permet (fin propre, sans couper un mot). */
export function fitWords(text: string, seconds: number): string {
  const max = Math.max(3, Math.floor(seconds * WORDS_PER_SECOND));
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return text.trim();
  return `${words.slice(0, max).join(" ").replace(/[,;:]$/, "")}.`;
}

/** Durées des parties présentes (somme exacte = durée visée, arrondie au dixième). */
export function allocate(parts: ScriptPart[], total: number): number[] {
  const sum = parts.reduce((s, p) => s + SHARE[p], 0);
  const raw = parts.map((p) => Math.max(1.6, (SHARE[p] / sum) * total));
  const scale = total / raw.reduce((a, b) => a + b, 0);
  const out = raw.map((d) => Math.round(d * scale * 10) / 10);
  out[out.length - 1] = Math.round((total - out.slice(0, -1).reduce((a, b) => a + b, 0)) * 10) / 10;
  return out;
}

/** Ton des phrases selon le style narratif (formulations sobres, aucune promesse inventée). */
function voiceLines(i: AdInsight, st: CreativeStrategy, intent: VideoIntent): Record<ScriptPart, { voice: string; onScreen: string }> {
  const services = i.business === "services";
  const style: NarrativeStyle = st.style.narrative;
  const you = style === "conversational" ? "Franchement, " : "";
  const usage = spokenUsage(i);
  const end = (x: string) => x.trim().replace(/[.;:,!?…\s]+$/, "");
  const svc = i.services[0];
  const fact = i.facts[0];
  const second = i.facts[1];
  const hook = st.hook;
  const development = services
    ? `${you}${svc ? `${svc.name}${svc.description ? ` : ${svc.description}` : ""}` : i.category.label}${i.area ? `, à ${i.area} et alentours` : ""}.`
    : `${you}${i.offerName}${i.difference && end(i.difference) !== end(hook) ? `. ${end(i.difference)}` : `, ${i.category.label.toLowerCase()}`}.`;
  const demonstration = services
    ? intent.kind === "trade_video"
      ? `On vous montre les étapes, du début à la finition.`
      : `Voici comment se passe une intervention, étape par étape.`
    : intent.kind === "product_tutorial"
      ? `Étape par étape : ${usage ?? "la prise en main"}.`
      : `Regardez-le en situation.`;
  const proof = fact ? `${end(`${fact.label} : ${fact.value}`)}${second ? `. ${end(`${second.label} : ${second.value}`)}` : ""}.` : st.proofs[0] ? `${end(st.proofs[0])}.` : "";
  const sameName = i.offerName.trim().toLowerCase() === i.brand.trim().toLowerCase();
  const conclusion = services ? `${i.brand}, ${i.category.label.toLowerCase()} de confiance.` : sameName ? `${i.brand}, ${i.category.label.toLowerCase()}.` : `${i.offerName}, par ${i.brand}.`;
  const cta = `${st.cta}.`;
  return {
    hook: { voice: hook, onScreen: hook },
    development: { voice: development, onScreen: services ? (svc?.name ?? i.category.label) : i.category.label },
    demonstration: { voice: demonstration, onScreen: "" },
    proof: { voice: proof, onScreen: fact ? `${fact.label} : ${fact.value}` : (st.proofs[0] ?? "") },
    conclusion: { voice: conclusion, onScreen: i.brand },
    cta: { voice: cta, onScreen: st.cta },
  };
}

/** Script local (gratuit) : la base de toute vidéo, et le repli quand l'IA échoue au contrôle. */
export function localScript(i: AdInsight, st: CreativeStrategy, intent: VideoIntent): VideoScript {
  const parts: ScriptPart[] = ["hook", "development", "demonstration", ...(st.proofs.length ? (["proof"] as const) : []), "conclusion", "cta"];
  // Vidéo très courte : on garde l'essentiel (accroche, démonstration, CTA).
  const kept = st.durationS < 10 ? parts.filter((p) => p === "hook" || p === "demonstration" || p === "cta") : parts;
  const durations = allocate(kept, st.durationS);
  const lines = voiceLines(i, st, intent);
  const cap = (x: string) => x.charAt(0).toLocaleUpperCase() + x.slice(1);
  const sections = kept.map((part, k) => ({ part, durationS: durations[k], voice: fitWords(lines[part].voice, durations[k]), onScreen: cap(lines[part].onScreen.slice(0, 60)) }));
  return { style: st.style.narrative, sections, by: "local", issues: scriptIssues(sections, { proofs: st.proofs, facts: i.facts, claimsToAvoid: i.claimsToAvoid }) };
}

export const ScriptSchema = z.object({
  sections: z
    .array(z.object({ part: z.enum(["hook", "development", "demonstration", "proof", "conclusion", "cta"]), voice: z.string().max(400).catch(""), onScreen: z.string().max(80).catch("") }))
    .min(2)
    .max(10),
});
export type ScriptDraft = z.infer<typeof ScriptSchema>;

export function scriptSystem(lang: "fr" | "en"): string {
  return [
    `Tu es scénariste de vidéos commerciales courtes. Langue : ${lang === "fr" ? "français" : "anglais"}.`,
    "Structure : accroche d'ouverture, développement, démonstration ou argument, preuve DISPONIBLE (seulement si fournie), conclusion, appel à l'action.",
    "Phrases naturelles, crédibles, au public décrit. Interdits : formules creuses (révolutionnaire, incroyable, le meilleur, ne cherchez plus…), chiffres, avis, certifications, garanties ou résultats absents des faits fournis.",
    "N'invente jamais un témoignage ; un personnage de vidéo UGC est un personnage, pas un client réel.",
    "Respecte le nombre de mots par section (débit naturel de 2,4 mots par seconde).",
  ].join("\n");
}

export function scriptPrompt(i: AdInsight, st: CreativeStrategy, intent: VideoIntent, durations: { part: ScriptPart; durationS: number }[], feedback?: string): string {
  return [
    `Intention : ${intent.kind} — but : ${intent.goal}. Plateforme : ${intent.platform}. Durée totale : ${st.durationS} s.`,
    `Marque : ${i.brand}. Offre : ${i.offerName} (${i.category.label}). Audience : ${st.audience}.`,
    `Angle : ${st.angle}. Message : ${st.message}. Émotion : ${st.emotion}. Style narratif : ${st.style.narrative}.`,
    `Faits confirmés : ${i.facts.map((f) => `${f.label} = ${f.value}`).join(" ; ") || "aucun"}. Preuves disponibles : ${st.proofs.join(" ; ") || "aucune"}.`,
    i.claimsToAvoid.length ? `Affirmations à éviter : ${i.claimsToAvoid.join(" ; ")}.` : "",
    `Sections et durées : ${durations.map((d) => `${d.part} ${d.durationS} s (≤ ${Math.floor(d.durationS * WORDS_PER_SECOND)} mots)`).join(", ")}. CTA : « ${st.cta} ».`,
    feedback ? `CORRIGE ces défauts de la version précédente : ${feedback}` : "",
    'Réponds { "sections": [{ "part": "hook|development|demonstration|proof|conclusion|cta", "voice": "…", "onScreen": "texte court à l\'écran" }] }.',
  ]
    .filter(Boolean)
    .join("\n");
}

/** Brouillon IA → sections aux durées prévues (une partie inconnue ou une preuve sans matière est écartée). */
export function fromDraft(d: ScriptDraft, base: VideoScript, hasProof: boolean): ScriptSection[] {
  const plan = new Map(base.sections.map((s) => [s.part, s.durationS]));
  return d.sections
    .filter((s) => plan.has(s.part) && (s.part !== "proof" || hasProof))
    .map((s) => ({ part: s.part, durationS: plan.get(s.part)!, voice: s.voice.trim(), onScreen: s.onScreen.trim().slice(0, 60) }));
}
