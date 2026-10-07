/**
 * Faits du projet (Project Brain 2B) : une nouvelle analyse (relancée par le client) ne doit jamais effacer ce que le
 * client a saisi ou confirmé après la création.
 *
 * Priorité : FAIT DU CLIENT (source « user ») > décision validée > fait confirmé importé > déduction > défaut.
 * Un fait INCONNU reste inconnu tant qu'aucune source réelle ne le confirme (jamais promu par une déduction).
 * Les préférences (« je préfère du bleu ») ne sont pas des faits : elles vivent dans la mémoire, jamais ici.
 *
 * Même produit / produit remplacé : quand le client remplace réellement son produit, les anciennes caractéristiques ne
 * doivent pas contaminer le nouveau. Aucun signal fiable n'existe encore dans le studio ; l'API est prête
 * (relation « replaced ») et le comportement par défaut est « même produit » (cas de la relance d'analyse).
 */
import type { Fact, ProductProfile } from "../project-types";

export type EntityRelation = "same" | "replaced";

const answered = (p: ProductProfile) => p.questions.filter((q) => q.answer?.trim());
const isBlank = (p: ProductProfile) => !p.name && !p.facts.length && !answered(p).length && p.price.amount === null;
/** Fait saisi ou confirmé par le client (réponse, édition dans le studio). */
const fromUser = (f: Fact) => f.source === "user" && f.status !== "unknown";

/** Relation entre l'ancien et le nouveau profil. Sans signal explicite (à venir), c'est le même produit. */
export function entityRelation(_prev: ProductProfile, _next: ProductProfile, signal?: EntityRelation): EntityRelation {
  return signal ?? "same";
}

/** Fusion d'une nouvelle analyse avec le profil existant, sans perdre les informations du client. */
export function mergeProductProfile(prev: ProductProfile | null | undefined, next: ProductProfile, opts: { relation?: EntityRelation } = {}): ProductProfile {
  if (!prev || isBlank(prev) || entityRelation(prev, next, opts.relation) === "replaced") return next;
  // Faits : ceux du client priment ; un fait inconnu de la nouvelle analyse ne remplace jamais un fait connu.
  const byKey = new Map(next.facts.map((f) => [f.key, f]));
  for (const f of prev.facts) {
    const n = byKey.get(f.key);
    if (fromUser(f)) byKey.set(f.key, f);
    else if (n && n.status === "unknown" && f.status === "confirmed") byKey.set(f.key, f);
    else if (!n && f.status === "confirmed") byKey.set(f.key, f);
  }
  // Réponses du client : reportées sur les questions équivalentes, et conservées sinon.
  const prevAnswers = answered(prev);
  const questions = next.questions.map((q) => {
    const a = prevAnswers.find((x) => x.id === q.id || (x.factKey && x.factKey === q.factKey));
    return a ? { ...q, answer: a.answer } : q;
  });
  for (const a of prevAnswers) if (!questions.some((q) => q.id === a.id || q.factKey === a.factKey)) questions.push(a);
  const userName = prev.nameStatus === "provided" && prev.name;
  return {
    ...next,
    name: userName ? prev.name : next.name,
    nameStatus: userName ? prev.nameStatus : next.nameStatus,
    facts: [...byKey.values()],
    questions,
    // Prix confirmé déjà connu (saisi ou corrigé par le client) : jamais perdu ni remplacé par « inconnu ».
    price: prev.price.status === "confirmed" && prev.price.amount !== null ? prev.price : next.price,
    variants: next.variants.length ? next.variants : prev.variants,
    claimsToAvoid: [...new Set([...prev.claimsToAvoid, ...next.claimsToAvoid])],
  };
}
