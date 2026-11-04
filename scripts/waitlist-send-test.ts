/**
 * #420 — Envoie UNE inscription FICTIVE signée au Studio, exactement comme le fera le serveur du site de la liste
 * d'attente, pour vérifier le raccordement de bout en bout (inscription → Administration → e-mail interne).
 *
 * Usage (le secret n'est jamais écrit dans un fichier ni dans la conversation : il vient de l'environnement) :
 *   WAITLIST_STUDIO_URL=https://votre-studio.exemple \
 *   WAITLIST_STUDIO_SECRET=wl_… \
 *   npx tsx scripts/waitlist-send-test.ts [--doublon]
 *
 * Données entièrement fictives (adresse en @example.com, réservée aux exemples : aucun e-mail n'y est jamais envoyé ;
 * le Studio n'écrit de toute façon qu'à l'adresse interne). `--doublon` renvoie la même inscription : réponse
 * « duplicate » attendue et aucun second e-mail.
 */
import { signPayload } from "../src/lib/waitlist";

const base = process.env.WAITLIST_STUDIO_URL?.replace(/\/$/, "");
const secret = process.env.WAITLIST_STUDIO_SECRET;
if (!base || !secret) {
  console.error("Renseignez WAITLIST_STUDIO_URL et WAITLIST_STUDIO_SECRET dans l'environnement.");
  process.exit(2);
}
const stamp = process.env.WAITLIST_TEST_ID ?? new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const signup = {
  id: `essai-${stamp}`,
  firstName: "Essai",
  email: `essai.liste.attente+${stamp}@example.com`,
  category: "Essai de raccordement (fictif)",
  description: "Inscription fictive envoyée par scripts/waitlist-send-test.ts — à ignorer.",
  consent: true,
  consentAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  offer: "−20 % chaque mois pendant 12 mois (forfait mensuel) ou −30 % (forfait annuel)",
};
const send = async () => {
  const raw = JSON.stringify({ kind: "signup", signup });
  const r = await fetch(`${base}/api/waitlist/ingest`, { method: "POST", headers: { "content-type": "application/json", "x-waitlist-signature": signPayload(raw, secret) }, body: raw });
  console.log(`${r.status} ${await r.text()}`);
  return r.status;
};
const first = await send();
if (process.argv.includes("--doublon")) await send();
process.exit(first === 201 || first === 200 ? 0 : 1);
