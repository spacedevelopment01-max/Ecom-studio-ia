/**
 * UGC V2 : contenu de style « créateur » avec un personnage SYNTHÉTIQUE, toujours signalé (« Vidéo générée par
 * IA »), jamais présenté comme un vrai client. Fiche de personnage unique pour toute la vidéo (visage, tenue, lieu,
 * voix) : même image de départ et mêmes consignes à chaque plan ; une rupture est détectée au contrôle des plans.
 * Le script parle de l'expérience du produit sans faux témoignage (« je l'utilise depuis 6 mois », « client
 * depuis… », « mon avis honnête » sont refusés).
 */
import crypto from "node:crypto";
import type { AdInsight } from "../ads-v2/types";
import { AI_LABELS } from "../engine/ugc";
import { contentLang } from "../i18n-server";
import type { ScriptSection } from "./types";

export type PersonaSheet = { id: string; face: string; outfit: string; setting: string; voice: string; age: string };

const OUTFITS = ["sweat ample couleur sable", "chemise en lin écrue", "t-shirt uni gris chiné", "pull fin bleu marine", "veste en jean délavé"];
const SETTINGS: Record<string, string[]> = {
  products: ["salle de bain lumineuse, carrelage clair", "cuisine claire, plan de travail en bois", "salon avec canapé et plantes", "bureau à domicile rangé, lumière de fenêtre"],
  services: ["devant le lieu de l'activité, lumière du jour", "intérieur de l'atelier ou du local, rangé", "pièce du client après l'intervention"],
};
const FACES = ["visage ovale, cheveux châtains mi-longs", "visage rond, cheveux courts bruns", "visage fin, cheveux noirs attachés", "visage carré, barbe courte, cheveux poivre et sel"];

/** Fiche stable par projet (même personnage d'une vidéo à l'autre de la campagne), jamais une personne réelle. */
export function personaSheet(projectId: string, i: AdInsight): PersonaSheet {
  const h = parseInt(crypto.createHash("sha256").update(`persona:${projectId}`).digest("hex").slice(0, 8), 16);
  const settings = SETTINGS[i.business];
  const adult = i.audience.adultsOnly ? "parent de 30 à 40 ans" : "adulte de 25 à 45 ans";
  return {
    id: `persona-${(h % 9973).toString(36)}`,
    face: FACES[h % FACES.length],
    outfit: OUTFITS[(h >> 3) % OUTFITS.length],
    setting: settings[(h >> 6) % settings.length],
    voice: "voix naturelle, débit posé, ton amical",
    age: adult,
  };
}

/** Consigne de personnage répétée à chaque plan (continuité). */
export const personaPrompt = (s: PersonaSheet) => `Same synthetic presenter in every shot: ${s.age}, ${s.face}, wearing ${s.outfit}, in ${s.setting}; ${s.voice}. Natural hand gestures, handheld selfie framing. The person is an AI-generated character, not a real customer.`;

const FAKE_TESTIMONIAL = [
  /\bj'?(?:ai|l'ai) (?:achet|command|test[ée] pendant)/i,
  /\bje (?:l'?utilise|m'en sers) depuis\b/i,
  /\b(?:cliente?|client) depuis\b/i,
  /\bmon avis (?:honn[êe]te|sinc[èe]re)\b/i,
  /\bvrai(?:e)? (?:avis|t[ée]moignage)\b/i,
  /\bI(?:'ve)? (?:bought|ordered|been using)\b/i,
  /\bhonest review\b/i,
  /\bcustomer since\b/i,
];

/** Défauts propres à l'UGC : faux témoignage, personnage présenté comme réel. */
export function ugcScriptIssues(sections: ScriptSection[]): string[] {
  const issues: string[] = [];
  for (const s of sections) for (const re of FAKE_TESTIMONIAL) if (re.test(s.voice) || re.test(s.onScreen)) issues.push(`${s.part} : faux témoignage (« ${(s.voice.match(re) ?? s.onScreen.match(re))![0]} ») — un personnage généré n'est pas un client`);
  return [...new Set(issues)];
}

/** Réécrit une réplique fautive en présentation honnête (sans expérience inventée). */
export function honestLine(i: AdInsight): string {
  return contentLang() === "en" ? `Let me show you ${i.offerName}.` : `Je vous montre ${i.offerName}.`;
}

export const disclosureLabel = () => (contentLang() === "en" ? AI_LABELS.en : AI_LABELS.fr);
