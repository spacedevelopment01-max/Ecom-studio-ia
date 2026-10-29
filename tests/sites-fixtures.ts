/**
 * Sites de services FICTIFS pour l'hébergement (#232) : compte fictif avec forfait actif, projet de services composé par
 * le studio dans un thème de services existant, puis informations « à compléter » renseignées comme le ferait le client
 * (horaires, parcours, pages légales). Aucune donnée réelle, aucun appel réseau.
 */
import { createUser } from "@/lib/auth";
import { id, now, run } from "@/lib/db";
import { alignPeriod, getSubscription, syncAllowance } from "@/lib/billing";
import { composeShop } from "@/lib/engine/shop";
import { saveThemeVersion } from "@/lib/projects";
import { policyHtml } from "@/lib/sites/policies";
import type { ThemeSpec } from "@/lib/theme/spec";
import { seedHoldout } from "./lot1-holdout-fixtures";

/** Réponses fictives du client aux textes laissés à compléter par la composition. */
const FILLED: [RegExp, string][] = [
  [/horaires/i, "Du lundi au vendredi, de 9 h à 18 h."],
  [/parcours|façon de travailler/i, "Quinze ans de métier, chaque intervention est préparée après un échange."],
  [/tarifs/i, "Tarif communiqué sur devis, après échange."],
  [/modalités du devis/i, "Le devis est gratuit et valable un mois."],
  [/date/i, "29 octobre 2026"],
];
const PLACEHOLDER = /\[(?:À|A) (?:compléter|définir|préciser)\s*:?\s*([^\]]*)\]/g;
const fill = (s: string) => s.replace(PLACEHOLDER, (_all, what: string) => FILLED.find(([re]) => re.test(what))?.[1] ?? "Information fictive renseignée pour la recette.");

/** Remplace partout les textes à compléter (comme le client dans l'éditeur du site) et rédige les pages légales. */
export function completeSite(spec: ThemeSpec, business: string): ThemeSpec {
  const out = JSON.parse(JSON.stringify(spec, (_k, v) => (typeof v === "string" ? fill(v) : v))) as ThemeSpec;
  out.store.policies = out.store.policies.map((p) => ({
    ...p,
    body_html: policyHtml(`${p.title} de ${business} (entreprise fictive de recette).\n\nÉditeur : ${business}, entreprise fictive, 1 rue de l'Exemple, 69000 Lyon.\n\nHébergement : E-com Studio IA (prototype de recette, hébergeur à désigner avant toute mise en service).`),
  }));
  return out;
}

export async function payingUser(label = "sites") {
  const u = await createUser(`${label}-${id()}@example.test`, "motdepasse-test-uniquement", "Compte fictif");
  run("UPDATE users SET role='client' WHERE id=?", u.id);
  getSubscription(u.id);
  run("UPDATE subscriptions SET status='active',plan='vendre',billing='monthly',owner_user_id=? WHERE user_id=?", u.id, u.id);
  alignPeriod(u.id, now());
  syncAllowance(u.id);
  return u;
}

/** Projet de services fictif composé dans `direction`, prêt à publier (textes renseignés). */
export async function servicesSite(userId: string, direction: "aplat" | "rive" | "maison-horizon" = "aplat", name = "Atelier musical", holdout = 2) {
  const pid = seedHoldout(userId, holdout, name);
  const { spec } = await composeShop(pid, direction, null, false);
  const version = saveThemeVersion(pid, completeSite(spec, name), "Site fictif de recette", "user");
  return { pid, version, spec: completeSite(spec, name) };
}
