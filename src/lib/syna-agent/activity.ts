/**
 * Étape 5 du parcours SINA (#492) : L'ACTIVITÉ COMPLÈTE.
 *
 * Tout est GRATUIT et fait avec les mots du client : la fiche de l'entreprise (coordonnées pour le site et ses pages
 * légales), la stratégie de l'angle choisi à l'étape 4 (accroche, messages clés, objections et réponses — déjà écrits
 * par la recherche, jamais réinventés), l'offre et ses prix (ceux du client, proposés jamais imposés) et les produits,
 * créés dans l'onglet Produits du Studio (source unique pour le site). Ce qui manque devient une question au client.
 */
import { json, run } from "../db";
import { L } from "../i18n-server";
import { loadProject } from "../projects";
import { listProducts } from "../products/catalog";
import { stateOf } from "../preparation/store";
import type { Journey } from "./journey";

/** Fiche de l'entreprise (coordonnées du site et de ses pages légales), avec les mots du client. */
export type Company = { legalName?: string; email?: string; phone?: string; address?: string; siret?: string; shipping?: string; returns?: string };
export const COMPANY_FIELDS: { key: keyof Company; label: string; question: string; required: boolean }[] = [
  { key: "legalName", label: "Nom de l'entreprise", question: "Quel est le nom officiel de ton entreprise (raison sociale, ou ton nom si tu es micro-entrepreneur) ?", required: true },
  { key: "email", label: "E-mail de contact", question: "Quelle adresse e-mail tes clients peuvent-ils utiliser pour te contacter ?", required: true },
  { key: "phone", label: "Téléphone", question: "Veux-tu afficher un numéro de téléphone sur le site ? Si oui, lequel ?", required: false },
  { key: "address", label: "Adresse", question: "Quelle est l'adresse de ton entreprise (elle figure dans les mentions légales) ?", required: true },
  { key: "siret", label: "SIRET", question: "Quel est ton numéro SIRET ? Tu peux le donner plus tard si tu ne l'as pas sous la main.", required: false },
  { key: "shipping", label: "Livraison", question: "Comment livres-tu (transporteur, délai, prix de la livraison, livraison offerte à partir d'un montant) ?", required: true },
  { key: "returns", label: "Retours", question: "Acceptes-tu les retours ? Si oui, sous quel délai et à quelles conditions (pour de l'alimentaire, souvent : pas de retour une fois le pot ouvert) ?", required: true },
];

export function companyOf(projectId: string): Company {
  const p = loadProject(projectId);
  return (p.settings as any).company ?? {};
}

/** Enregistre les coordonnées dans les réglages du projet (jamais effacées : un champ absent reste tel quel). */
export function saveCompany(projectId: string, fields: Company): Company {
  const p = loadProject(projectId);
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => typeof v === "string" && v.trim()).map(([k, v]) => [k, (v as string).trim().slice(0, 600)]));
  const company = { ...companyOf(projectId), ...clean };
  run("UPDATE projects SET settings_json=?, updated_at=? WHERE id=?", JSON.stringify({ ...json<Record<string, unknown>>(p.row.settings_json, {}), company }), Date.now(), projectId);
  return company;
}

/**
 * Coordonnées reconnues sans IA dans la réponse « coordonnées » de l'étape 0 (e-mail, téléphone, SIRET) : reportées
 * dans le projet pour ne jamais les redemander (audit du 10 novembre 2026). Le reste (raison sociale, adresse) est relu
 * par SINA à l'étape 5 dans les mots du client, puis enregistré sans nouvelle question.
 */
export function companyFromText(text: string): Company {
  const out: Company = {};
  const email = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(text);
  if (email) out.email = email[0];
  const siret = /\b(\d{3}\s?\d{3}\s?\d{3}\s?\d{5})\b/.exec(text);
  if (siret) out.siret = siret[1].replace(/\s/g, "");
  const phone = /(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/.exec(text.replace(siret?.[0] ?? "\u0000", " "));
  if (phone) out.phone = phone[0].trim();
  return out;
}

export type ActivityPlan = {
  company: Company;
  /** Coordonnées facultatives que le client ne veut PAS sur le site (« pas de téléphone »), à ne plus demander. */
  none: (keyof Company)[];
  missing: { key: keyof Company; question: string; required: boolean }[];
  angle: { id: string; title: string; goal: string; message: string; story: string; show: string; cta: string; others: string[] } | null;
  keyMessages: string[];
  objections: { objection: string; answer: string }[];
  offer: { price: string | null; facts: string[] };
  products: { id: string; title: string; price: number | null; status: string }[];
  /** Entreprise de services : ses prestations (profil des services) remplacent les produits ; ni livraison ni retours. */
  services?: { name: string; price: string | null; duration: string | null }[];
  at: number;
};

/** Coordonnées sans objet pour une entreprise de services (rien n'est livré ni retourné). */
const NOT_FOR_SERVICES: (keyof Company)[] = ["shipping", "returns"];

/**
 * Un fait de l'offre en une ligne lisible : son libellé court, ou la réponse seule quand le libellé est la question posée
 * au client (essai réel : « Pouvez-vous recopier la liste des ingrédients… ? : Abricot… »).
 */
export function factLine(f: { label: string; value: string }): string {
  const label = f.label.trim();
  return /\?\s*(\(.*\))?$/.test(label) || label.length > 60 ? f.value : `${label} : ${f.value}`;
}

/**
 * Un fait qui décrit plusieurs produits d'un bloc (« Thé vert jasmin : … . Thé noir aux agrumes : … ») : une ligne par
 * produit (essai réel du 7 novembre : les six compositions en un seul paragraphe illisible).
 */
export function factItems(line: string): string[] {
  const parts = line.split(/(?<=\.)\s+(?=[A-ZÀ-Ý][^.:\n]{1,50}\s:\s)/).map((x) => x.trim()).filter(Boolean);
  // Nombre et unité jamais séparés en fin de ligne (essai réel : « 8 » puis « % » à la ligne).
  const tie = (x: string) => x.replace(/(\d)\s+(%|€|g\b|kg\b|ml\b|cl\b|l\b)/g, "$1\u00a0$2");
  return (parts.length >= 3 ? parts : [line]).map(tie);
}

/** Le plan de l'activité tel qu'il est aujourd'hui (lecture, gratuit). */
export function activityPlan(projectId: string, j: Journey): ActivityPlan {
  const p = loadProject(projectId);
  const company = companyOf(projectId);
  const later = new Set<string>(((p.settings as any).companyLater ?? []) as string[]);
  const none = (((p.settings as any).companyNone ?? []) as (keyof Company)[]).filter((k) => !company[k]);
  const services = p.business === "services";
  const missing = COMPANY_FIELDS.filter((f) => !company[f.key] && !later.has(f.key) && !none.includes(f.key) && !(services && NOT_FOR_SERVICES.includes(f.key))).map(({ key, question, required }) => ({ key, question, required }));
  const ids = j.angleChoice?.ids ?? (j.angleChoice ? [j.angleChoice.id] : []);
  const a = j.angles?.list.find((x) => x.id === ids[0]);
  // Messages clés et objections : ceux de la recherche pour CET angle (jamais réinventés).
  const raw: any = ((stateOf(projectId)?.stages as any)?.research?.data?.angles ?? []).find((x: any) => x.id === ids[0]);
  // Prix de la fiche en CENTIMES (essai réel : « 790 € » affiché au lieu de 7,90 €).
  const pr = p.product.price;
  const price = pr?.amount != null && pr.status === "confirmed" ? `${(pr.amount / 100).toFixed(2).replace(".", ",").replace(/,00$/, "")} ${pr.currency === "EUR" ? "€" : pr.currency}` : null;
  return {
    company, none, missing,
    angle: a ? { id: a.id, title: a.title, goal: a.goal, message: a.message, story: a.story, show: a.show, cta: a.cta, others: ids.slice(1).map((id) => j.angles!.list.find((x) => x.id === id)?.title ?? id) } : null,
    keyMessages: (raw?.arguments ?? []).slice(0, 5).map((x: string) => String(x).slice(0, 300)),
    objections: (raw?.objections ?? []).slice(0, 5).map((o: any) => ({ objection: String(o.objection).slice(0, 300), answer: String(o.answer).slice(0, 400) })),
    offer: { price, facts: p.product.facts.filter((f) => f.status === "confirmed" && !(price && /^prix$/i.test(f.label.trim()))).map(factLine).flatMap(factItems).slice(0, 16) },
    products: listProducts(projectId).map((x) => ({ id: x.id, title: x.data.title, price: x.data.price == null ? null : x.data.price / 100, status: x.status })),
    ...(services ? { services: (p.services?.services ?? []).map((x) => ({ name: x.name, price: x.price?.trim() || null, duration: x.duration?.trim() || null })) } : {}),
    at: Date.now(),
  };
}

/** Ce qui manque encore avant de valider l'étape 5 (dit au client, jamais contourné). */
export function activityGaps(plan: ActivityPlan): string[] {
  const gaps: string[] = [];
  for (const m of plan.missing.filter((x) => x.required)) gaps.push(L(COMPANY_FIELDS.find((f) => f.key === m.key)!.label.replace(/^(\p{Lu})(?!\p{Lu})/u, (c) => c.toLocaleLowerCase("fr-FR")), `missing: ${m.key}`));
  if (plan.services) { if (!plan.services.length) gaps.push(L("aucune prestation enregistrée", "no service recorded")); }
  else if (!plan.products.length) gaps.push(L("aucun produit créé dans l'onglet Produits", "no product created"));
  for (const x of plan.products.filter((x) => x.price == null)) gaps.push(L(`prix manquant pour « ${x.title} »`, `missing price for ${x.title}`));
  if (!plan.angle) gaps.push(L("aucun angle choisi (étape 4)", "no angle chosen"));
  return gaps;
}

/**
 * Le client ne veut PAS d'une coordonnée facultative sur le site (« pas de téléphone ») : ce n'est pas « plus tard »
 * (essai réel du 7 novembre : « pas de téléphone » enregistré comme à donner plus tard). Jamais une coordonnée obligatoire.
 */
export function companyNone(projectId: string, keys: (keyof Company)[]) {
  const p = loadProject(projectId);
  const s = json<Record<string, unknown>>(p.row.settings_json, {});
  const allowed = keys.filter((k) => !COMPANY_FIELDS.find((f) => f.key === k)?.required);
  run("UPDATE projects SET settings_json=?, updated_at=? WHERE id=?", JSON.stringify({ ...s, companyNone: [...new Set([...((s.companyNone as string[]) ?? []), ...allowed])] }), Date.now(), projectId);
  return allowed;
}

/** Le client préfère donner une coordonnée facultative plus tard (jamais une coordonnée obligatoire du site). */
export function companyLater(projectId: string, keys: (keyof Company)[]) {
  const p = loadProject(projectId);
  const s = json<Record<string, unknown>>(p.row.settings_json, {});
  const allowed = keys.filter((k) => !COMPANY_FIELDS.find((f) => f.key === k)?.required);
  run("UPDATE projects SET settings_json=?, updated_at=? WHERE id=?", JSON.stringify({ ...s, companyLater: [...new Set([...((s.companyLater as string[]) ?? []), ...allowed])] }), Date.now(), projectId);
  return allowed;
}
