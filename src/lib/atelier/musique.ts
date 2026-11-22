/**
 * LA MUSIQUE ET LA VOIX DE L'ATELIER (rapport 10, point 11).
 *
 * La musique vient du compositeur du Studio (`media/song.ts`) : composée sur place, à l'ambiance de la marque, sans
 * fournisseur, sans droits à payer. ElevenLabs n'est PAS branché : ses conditions « OEM » interdisent l'intégration aux
 * formules Free, Starter, Creator et Pro, et sa licence garde le droit d'utiliser les contenus ; c'est au propriétaire de
 * décider (formule Scale, conditions à faire accepter). Rien de payant n'est ajouté ici.
 */
import { songStyleFor, SONG_STYLE_LABELS, type SongStyle } from "../media/song";

export const ELEVENLABS_BRANCHE = false;
export const ELEVENLABS_RAISON: readonly [string, string] = [
  "La voix et la musique d'ElevenLabs attendent la décision du propriétaire (sa formule doit permettre l'intégration).",
  "ElevenLabs voice and music await the owner's decision (its plan must allow integration).",
];

/** Le style de musique composé pour la marque du projet, et son nom à montrer. */
export function musiqueAtelier(p: Parameters<typeof songStyleFor>[0]): { style: SongStyle; source: "studio"; payante: false } {
  return { style: songStyleFor(p), source: "studio", payante: false };
}

export const nomMusique = (style: SongStyle, lang: "fr" | "en"): string => SONG_STYLE_LABELS[style]?.[lang] ?? style;
