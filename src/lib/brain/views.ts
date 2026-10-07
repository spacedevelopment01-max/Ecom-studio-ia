/**
 * Project Brain — vues ciblées par scope (phase 2.0, lecture seule, branchées sur aucun moteur).
 *
 * Chaque information devient un élément typé :
 *  - niveau : HARD (fait confirmé, correction, décision validée, refus explicite du client, règle de véracité),
 *             SOFT (préférence non verrouillée, marque adaptable), ADVISORY (déduction, constat automatique) ;
 *  - rang (1 = prioritaire … 7 = secondaire) et « critique » (jamais retiré pour respecter un budget) ;
 *  - « stable » : entre dans l'empreinte du scope (les constats automatiques du contrôle qualité n'y entrent pas).
 * Budget souple (dépassable par le critique, signalé) + plafond de sécurité (le secondaire part d'abord ; un élément
 * critique retiré est signalé explicitement). Le contexte VOLATIL (créations récentes) est séparé du contexte stable.
 */
import type { Project } from "../projects";
import { contactModesOf, sectorLabel } from "../project-types";
import { contentLang } from "../i18n-server";
import { placeholder } from "../ai/prompts";
import { servicesRulesText } from "./texts";
import { BRAIN_VERSION, stableHash } from "./hash";
import type { BrainSnapshot } from "./snapshot";

export const SCOPES = ["logo", "brand", "image", "stock", "theme", "shop_copy", "seo", "blog", "social", "advertising", "video", "qc", "all"] as const;
export type Scope = (typeof SCOPES)[number];
export type Level = "hard" | "soft" | "advisory";

export type BrainItem = {
  id: string;
  section: string;
  level: Level;
  tier: number;
  critical: boolean;
  /** Entre dans l'empreinte stable. */
  stable: boolean;
  scopes: readonly Scope[] | "*";
  /** Provenance (diagnostic : « sources »). */
  source: "project" | "brand" | "strategy" | "memory" | "quality" | "trade" | "assets";
  text: string;
  data: unknown;
};

/** Budgets en caractères (≈ 3,2 caractères par jeton). Souple : hypothèse initiale ; plafond : garde-fou. */
export const BUDGETS: Record<Scope, { soft: number; hard: number }> = {
  logo: { soft: 2500, hard: 8000 },
  brand: { soft: 5000, hard: 14000 },
  image: { soft: 2000, hard: 7000 },
  stock: { soft: 1200, hard: 5000 },
  theme: { soft: 6000, hard: 18000 },
  shop_copy: { soft: 6000, hard: 18000 },
  seo: { soft: 1800, hard: 6000 },
  blog: { soft: 3500, hard: 10000 },
  social: { soft: 3000, hard: 10000 },
  advertising: { soft: 3500, hard: 10000 },
  video: { soft: 3000, hard: 10000 },
  qc: { soft: 3000, hard: 10000 },
  all: { soft: 12000, hard: 30000 },
};

/** Scopes qui reçoivent les créations récentes (hors contexte stable). */
export const VOLATILE_SCOPES: readonly Scope[] = ["image", "theme", "social", "all"];

export type ContextView = {
  scope: Scope;
  /** Nom effectif (scope pur, ou vue de compatibilité « legacy:<scope> »). */
  label: string;
  brainVersion: string;
  hash: string;
  stable: string;
  volatile: string;
  chars: number;
  softBudget: number;
  hardCeiling: number;
  budgetExceeded: boolean;
  hardCeilingReached: boolean;
  sections: string[];
  dropped: string[];
  /** Éléments critiques retirés au plafond de sécurité (doit rester vide ; sinon signal explicite). */
  criticalDropped: string[];
  levels: Record<Level, number>;
  sources: Record<string, number>;
};

// Groupes de scopes réutilisés.
const TEXT: Scope[] = ["theme", "shop_copy", "seo", "blog", "social", "advertising", "video", "qc"];
const VISUAL_BRAND: Scope[] = ["logo", "brand", "image", "theme", "social", "advertising", "video"];
const CONTACT: Scope[] = ["theme", "shop_copy"];

/** Scope d'une ligne de mémoire (colonne scope actuelle : all | shop | images | video | social | brand, ou un scope du Brain). */
const MEMORY_SCOPE: Record<string, readonly Scope[] | "*"> = {
  all: "*",
  brand: ["logo", "brand", "image", "theme", "social", "advertising", "video"],
  shop: ["theme", "shop_copy", "seo", "blog"],
  images: ["image", "stock"],
  video: ["video"],
  social: ["social", "advertising"],
};
const memoryScopes = (s: string): readonly Scope[] | "*" => MEMORY_SCOPE[s] ?? ((SCOPES as readonly string[]).includes(s) ? [s as Scope] : "*");

/** Scope concerné par un constat du contrôle qualité, selon le livrable contrôlé. */
const DELIVERABLE_SCOPE = (d: string): Scope[] =>
  d.startsWith("logo") ? ["logo"] : d.startsWith("stock") ? ["stock", "image"] : d.startsWith("image") || d === "cutout" || d === "ugc_frame" ? ["image"] : d.startsWith("video") || d === "ugc_clip" ? ["video"] : d === "copy_shop" ? ["shop_copy"] : d === "seo_meta" ? ["seo"] : d === "blog_article" ? ["blog"] : d.startsWith("social") ? ["social"] : d === "ad_copy" ? ["advertising"] : d.startsWith("theme") ? ["theme"] : [];

/** Libellés des codes de défauts connus (sinon le code lui-même, lisible). */
const CODE_LABEL: Record<string, string> = {
  cliche: "symboles clichés",
  claim: "affirmations non vérifiées",
  small_sizes: "illisible en petite taille",
  name_mismatch: "nom mal écrit",
  extra_text: "texte en trop",
  resembles_known_brand: "ressemblance avec une marque connue",
  unreadable_letters: "lettres illisibles",
  off_topic: "hors sujet par rapport au métier",
  empty_wall: "scènes de mur vide hors sujet",
  wrong_product: "mauvais produit",
  deformed: "formes déformées",
  text_in_image: "texte dans l'image",
};
const codeLabel = (c: string) => CODE_LABEL[c] ?? c.replace(/_/g, " ");

const MODE_LABEL: Record<string, string> = { booking: "rendez-vous en ligne (lien de réservation)", quote: "demande de devis", call: "appel téléphonique", form: "formulaire de contact" };

const clip = (s: string | undefined | null, n: number) => {
  const t = (s ?? "").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** Éléments du Brain pour un projet (tous scopes confondus ; chaque vue filtre). Déterministe. */
export function brainItems(s: BrainSnapshot): BrainItem[] {
  const p: Project = s.project;
  const pr = p.product;
  const services = p.business === "services";
  // Espace réservé dans la langue des contenus (« [À compléter : …] » / « [To complete: …] »), comme le contexte actuel.
  const ph = placeholder(contentLang());
  const items: BrainItem[] = [];
  const add = (it: Omit<BrainItem, "stable" | "critical"> & { stable?: boolean; critical?: boolean }) => items.push({ stable: true, critical: false, ...it });

  // ------------------------------------------------------------------ identité et offre
  add({ id: "identity.kind", section: "identity", level: "hard", tier: 2, critical: true, scopes: "*", source: "project", text: services ? "Type : entreprise de services (site vitrine : rendez-vous, devis ou contact ; pas une boutique de produits)." : `Type : boutique de produits (${p.storeType}).`, data: { business: p.business, storeType: p.storeType } });
  add({
    id: "identity.offer",
    section: "identity",
    level: pr.nameStatus === "provided" ? "hard" : "soft",
    tier: 2,
    critical: true,
    scopes: "*",
    source: "project",
    text: `${services ? "Activité" : "Produit"} : ${pr.name || "inconnu"} · ${services ? "métier" : "catégorie"} : ${pr.category || "inconnu"} · secteur : ${sectorLabel(pr.sector)}`,
    data: { name: pr.name, nameStatus: pr.nameStatus, category: pr.category, sector: pr.sector },
  });
  if (pr.summary) add({ id: "identity.summary", section: "identity", level: "soft", tier: 6, scopes: ["brand", "theme", "shop_copy", "seo", "blog", "social", "advertising", "video", "logo", "all"], source: "project", text: `Résumé : ${clip(pr.summary, 600)}`, data: pr.summary });

  // Métier compris (déduit) : utile aux moteurs visuels et de recherche ; jamais un fait.
  const t = s.trade;
  add({
    id: "trade.profile",
    section: "trade",
    level: "advisory",
    tier: 5,
    critical: true,
    scopes: ["logo", "image", "stock", "video", "seo", "blog", "brand", "all"],
    source: "trade",
    text: `Métier compris (déduit, à confirmer) : ${t.labels.fr || "inconnu"}${t.actions.length ? ` · gestes : ${t.actions.join(", ")}` : ""} [${t.source}]`,
    data: { id: t.id, source: t.source, actions: t.actions },
  });
  if (t.visuals.positive.length || t.visuals.negative.length)
    add({ id: "trade.visuals", section: "trade", level: "advisory", tier: 5, critical: true, scopes: ["image", "stock", "video", "all"], source: "trade", text: `Scènes pertinentes : ${t.visuals.positive.join(" ; ")}${t.visuals.negative.length ? `. Hors sujet à écarter : ${t.visuals.negative.join(", ")}` : ""}.`, data: t.visuals });
  if (t.icons.keywords.length) add({ id: "trade.icons", section: "trade", level: "advisory", tier: 5, scopes: ["logo", "all"], source: "trade", text: `Objets du métier pour un symbole : ${t.icons.keywords.join(", ")}${t.icons.avoid.length ? ` (éviter : ${t.icons.avoid.join(", ")})` : ""}.`, data: t.icons });
  if (t.search.queries.length) add({ id: "trade.search", section: "trade", level: "advisory", tier: 5, critical: true, scopes: ["stock", "all"], source: "trade", text: `Recherches de photos (action + métier + lieu) : ${t.search.queries.join(" | ")}`, data: t.search.queries });

  // Faits du produit / de l'activité.
  const confirmed = pr.facts.filter((f) => f.status === "confirmed").slice(0, 20);
  const inferred = pr.facts.filter((f) => f.status === "inferred").slice(0, 20);
  const unknown = pr.facts.filter((f) => f.status === "unknown").slice(0, 20);
  for (const f of confirmed) add({ id: `fact.${f.key}`, section: "facts", level: "hard", tier: 3, critical: true, scopes: [...TEXT, "brand", "all"], source: "project", text: `Fait CONFIRMÉ — ${f.label} : ${clip(f.value, 300)}`, data: { k: f.key, v: f.value, s: f.status } });
  for (const f of unknown) add({ id: `unknown.${f.key}`, section: "facts", level: "hard", tier: 3, critical: true, scopes: [...TEXT, "all"], source: "project", text: `INCONNU — ${f.label} : ne jamais l'inventer (écrire « ${ph} » si un texte en a besoin).`, data: { k: f.key, s: f.status } });
  for (const f of inferred) add({ id: `inferred.${f.key}`, section: "facts", level: "advisory", tier: 6, scopes: [...TEXT, "image", "all"], source: "project", text: `Observation (à formuler avec prudence, jamais comme une promesse) — ${f.label} : ${clip(f.value, 200)}`, data: { k: f.key, v: f.value, s: f.status } });
  for (const q of pr.questions.filter((x) => x.answer).slice(0, 12)) add({ id: `answer.${q.id}`, section: "facts", level: "hard", tier: 3, critical: true, scopes: [...TEXT, "brand", "all"], source: "project", text: `Réponse du client — ${clip(q.question, 160)} → ${clip(q.answer, 300)}`, data: { q: q.id, a: q.answer } });
  if (pr.claimsToAvoid.length) add({ id: "claims.avoid", section: "facts", level: "hard", tier: 4, critical: true, scopes: [...TEXT, "image", "all"], source: "project", text: `Allégations interdites : ${pr.claimsToAvoid.join(" ; ")}`, data: pr.claimsToAvoid });
  if (!services) {
    add({ id: "product.price", section: "offer", level: "hard", tier: 3, critical: true, scopes: ["theme", "shop_copy", "advertising", "qc", "seo", "all"], source: "project", text: pr.price.amount !== null ? `Prix confirmé : ${(pr.price.amount / 100).toFixed(2)} ${pr.price.currency}` : "Prix : inconnu (ne jamais en inventer).", data: pr.price });
    if (pr.variants.length) add({ id: "product.variants", section: "offer", level: "hard", tier: 3, scopes: ["theme", "shop_copy", "advertising", "image", "all"], source: "project", text: `Variantes : ${pr.variants.map((v) => `${v.name} (${v.values.join(", ")})`).join(" ; ")}`, data: pr.variants });
    if (pr.visual.colors.length || pr.visual.description || pr.visual.shape)
      add({ id: "product.visual", section: "offer", level: "soft", tier: 6, scopes: ["image", "logo", "brand", "video", "advertising", "all"], source: "project", text: `Aspect du produit : ${[pr.visual.shape, clip(pr.visual.description, 300), pr.visual.colors.length ? `couleurs mesurées ${pr.visual.colors.map((c) => `${c.hex} ${c.name} ${Math.round(c.share * 100)} %`).join(", ")}` : ""].filter(Boolean).join(" · ")}`, data: pr.visual });
    if (pr.visual.labelText?.length) add({ id: "product.label", section: "offer", level: "hard", tier: 4, scopes: ["image", "theme", "shop_copy", "advertising", "video", "qc", "all"], source: "project", text: `Texte lisible sur le produit : ${pr.visual.labelText.join(" | ")}`, data: pr.visual.labelText });
    if (p.catalog.length > 1) add({ id: "product.catalog", section: "offer", level: "soft", tier: 4, scopes: ["theme", "shop_copy", "advertising", "seo", "all"], source: "project", text: `Catalogue (${p.catalog.length} produits) : ${p.catalog.slice(0, 8).map((c) => c.name).join(" ; ")}`, data: p.catalog.map((c) => [c.key, c.name, c.price]) });
  } else {
    const sv = p.services;
    const list = (sv.services ?? []).filter((x) => x.name.trim());
    add({ id: "services.offer", section: "offer", level: "soft", tier: 3, critical: true, scopes: [...TEXT, "brand", "stock", "image", "all"], source: "project", text: list.length ? `Prestations (saisies par le client) : ${list.slice(0, 12).map((x) => `${x.name}${x.description?.trim() ? ` (${clip(x.description, 120)})` : ""}${x.duration?.trim() ? ` · durée : ${x.duration.trim()}` : ""} · tarif : ${x.price?.trim() || "non communiqué"}`).join(" ; ")}` : `Prestations : aucune liste fournie (ne pas en inventer ; écrire « ${ph} »).`, data: list });
    if (sv.area?.trim()) add({ id: "services.area", section: "offer", level: "soft", tier: 4, scopes: [...TEXT, "stock", "all"], source: "project", text: `Zone d'intervention : ${clip(sv.area, 200)}`, data: sv.area });
    add({
      id: "services.contact",
      section: "offer",
      level: "soft",
      tier: 4,
      critical: true,
      scopes: [...CONTACT, "all"],
      source: "project",
      text: `Contact — mode principal : ${MODE_LABEL[sv.contactMode] ?? sv.contactMode}${contactModesOf(sv).length > 1 ? ` (aussi accepté : ${contactModesOf(sv).slice(1).map((m) => MODE_LABEL[m] ?? m).join(", ")})` : ""} · adresse : ${sv.address?.trim() || `inconnue (« ${ph} »)`} · horaires : ${sv.hours?.trim() || `inconnus (« ${ph} »)`} · téléphone : ${sv.phone?.trim() || `inconnu (« ${ph} »)`} · e-mail : ${sv.email?.trim() || `inconnu (« ${ph} »)`} · rendez-vous en ligne : ${sv.bookingUrl?.trim() || "aucun lien"}`,
      data: { m: contactModesOf(sv), a: sv.address, h: sv.hours, p: sv.phone, e: sv.email, b: sv.bookingUrl },
    });
    add({ id: "services.rules", section: "rules", level: "hard", tier: 4, critical: true, scopes: [...TEXT, "all"], source: "project", text: `Règles des services — ${servicesRulesText(ph)}`, data: "services.rules.v2" });
  }

  // ------------------------------------------------------------------ marque
  const b = p.brand;
  if (b) {
    const locked = (k: string) => b.validated.includes(k);
    add({ id: "brand.name", section: "brand", level: b.nameStatus === "proposed" && !locked("name") ? "soft" : "hard", tier: 2, critical: true, scopes: ["logo", "brand", "image", "theme", "shop_copy", "seo", "blog", "social", "advertising", "video", "qc", "all"], source: "brand", text: `Marque : ${b.name} (${locked("name") || b.nameStatus === "validated" ? "VALIDÉ" : b.nameStatus === "provided" ? "fourni par le client" : "proposé"})`, data: { n: b.name, s: b.nameStatus, l: locked("name") } });
    if (b.tagline) add({ id: "brand.tagline", section: "brand", level: locked("tagline") ? "hard" : "soft", tier: locked("tagline") ? 2 : 4, critical: locked("tagline"), scopes: ["logo", "brand", "theme", "shop_copy", "social", "advertising", "video", "all"], source: "brand", text: `Signature : « ${b.tagline} »${locked("tagline") ? " (VALIDÉE)" : ""}`, data: { t: b.tagline, l: locked("tagline") } });
    add({
      id: "brand.palette",
      section: "brand",
      level: locked("palette") ? "hard" : "soft",
      tier: locked("palette") ? 2 : 4,
      critical: true,
      scopes: [...VISUAL_BRAND, "all"],
      source: "brand",
      text: `Palette${locked("palette") ? " VALIDÉE (à respecter ; un accent ponctuel ne s'en écarte que si la création le justifie, sans remplacer les couleurs principales)" : " (adaptable)"} : principale ${b.palette.primary}, secondaire ${b.palette.secondary}, accent ${b.palette.accent}, clair ${b.palette.light}, sombre ${b.palette.dark}`,
      data: { p: b.palette, l: locked("palette") },
    });
    const route = b.logo?.route;
    const heading = route?.heading ?? b.fonts?.heading;
    const body = route?.body ?? b.fonts?.body;
    if (heading || body) add({ id: "brand.fonts", section: "brand", level: locked("fonts") ? "hard" : "soft", tier: locked("fonts") ? 2 : 4, scopes: ["logo", "brand", "theme", "social", "advertising", "video", "all"], source: "brand", text: `Typographies${locked("fonts") ? " VALIDÉES" : ""} : titres ${heading ?? "?"}, texte ${body ?? "?"}`, data: { h: heading, b: body, l: locked("fonts") } });
    add({ id: "brand.direction", section: "brand", level: "soft", tier: 4, scopes: ["logo", "brand", "image", "theme", "video", "all"], source: "brand", text: `Direction artistique : ${b.direction}`, data: b.direction });
    if (b.personality.length) add({ id: "brand.personality", section: "brand", level: "soft", tier: 5, scopes: ["logo", "brand", "social", "advertising", "video", "all"], source: "brand", text: `Personnalité : ${b.personality.join(", ")}`, data: b.personality });
    if (b.positioning) add({ id: "brand.positioning", section: "brand", level: "soft", tier: 5, scopes: ["logo", "brand", "theme", "shop_copy", "blog", "social", "advertising", "video", "all"], source: "brand", text: `Positionnement : ${clip(b.positioning, 300)}`, data: b.positioning });
    if (b.audience) add({ id: "brand.audience", section: "brand", level: "soft", tier: 5, scopes: ["logo", "brand", "theme", "shop_copy", "seo", "blog", "social", "advertising", "video", "all"], source: "brand", text: `Cible : ${clip(b.audience, 300)}`, data: b.audience });
    add({ id: "brand.tone", section: "brand", level: "soft", tier: 4, scopes: ["brand", "theme", "shop_copy", "blog", "social", "advertising", "video", "all"], source: "brand", text: `Ton : ${b.tone.voice}. À faire : ${b.tone.do.join(" ; ")}. À éviter : ${b.tone.dont.join(" ; ")}.`, data: b.tone });
    if (b.story) add({ id: "brand.story", section: "brand", level: "soft", tier: 7, scopes: ["brand", "blog", "all"], source: "brand", text: `Histoire : ${clip(b.story, 600)}`, data: b.story });
    if (b.validated.length) add({ id: "brand.validated", section: "brand", level: "hard", tier: 2, critical: true, scopes: ["logo", "brand", "theme", "image", "social", "advertising", "video", "all"], source: "brand", text: `Éléments VALIDÉS par le client (ne pas changer sans demande explicite) : ${b.validated.join(", ")}`, data: [...b.validated].sort() });
    if (b.social) add({ id: "brand.social", section: "brand", level: "soft", tier: 4, scopes: ["social", "advertising", "all"], source: "brand", text: `Ligne éditoriale — piliers : ${b.social.pillars.map((x) => x.title).join(" ; ")}. On dit : ${b.social.say.join(" ; ")}. On ne dit pas : ${b.social.dontSay.join(" ; ")}.`, data: { p: b.social.pillars, s: b.social.say, d: b.social.dontSay, e: b.social.emoji } });
  }
  const logo = s.currentLogo;
  if (logo) {
    const hard = logo.state === "validated" || logo.state === "provided";
    const label = { provided: "fourni par le client", validated: "VALIDÉ par le client", FINAL: "accepté par le contrôle qualité", PROVISIONAL: "PROVISOIRE (jamais à présenter comme définitif)", proposed: "proposé, non validé" }[logo.state];
    add({ id: "logo.current", section: "brand", level: hard ? "hard" : "soft", tier: 2, critical: true, scopes: ["logo", "brand", "theme", "social", "advertising", "video", "all"], source: "assets", text: `Logo actuel : ${label}${logo.name ? ` · piste « ${logo.name} »` : ""}${logo.concept ? ` · idée : ${clip(logo.concept, 200)}` : ""}${logo.source === "legacy_latest" ? " (déduit du dernier logo, ancien projet)" : ""}`, data: { s: logo.state, n: logo.name, c: logo.concept, src: logo.source } });
  }

  // ------------------------------------------------------------------ stratégie
  const st = p.strategy;
  if (st) {
    if (st.keyMessages.length) add({ id: "strategy.messages", section: "strategy", level: "soft", tier: 6, scopes: ["brand", "theme", "shop_copy", "blog", "social", "advertising", "video", "all"], source: "strategy", text: `Messages clés : ${st.keyMessages.join(" ; ")}`, data: st.keyMessages });
    if (st.pillars.length || st.angles.length) add({ id: "strategy.angles", section: "strategy", level: "soft", tier: 7, scopes: ["brand", "social", "advertising", "all"], source: "strategy", text: `Angles : ${st.angles.map((a) => a.title).join(" ; ")} · piliers : ${st.pillars.join(" ; ")}`, data: { a: st.angles.map((a) => a.title), p: st.pillars } });
    const pf = st.platform;
    if (pf) {
      const missing = pf.proofs.filter((x) => x.status === "missing" && x.claim);
      const ok = pf.proofs.filter((x) => x.status === "available" && x.claim);
      if (missing.length) add({ id: "strategy.unproven", section: "rules", level: "hard", tier: 4, critical: true, scopes: [...TEXT, "all"], source: "strategy", text: `Arguments SANS PREUVE (ne jamais les affirmer) : ${missing.map((x) => x.claim).join(" ; ")}`, data: missing.map((x) => x.claim) });
      if (ok.length) add({ id: "strategy.proofs", section: "strategy", level: "soft", tier: 5, scopes: ["theme", "shop_copy", "blog", "advertising", "qc", "all"], source: "strategy", text: `Preuves disponibles : ${ok.map((x) => `${x.claim} (${x.proof})`).join(" ; ")}`, data: ok });
      if (pf.persona || pf.difference || pf.problem || pf.alternatives)
        add({ id: "strategy.platform", section: "strategy", level: "soft", tier: 6, scopes: ["brand", "theme", "shop_copy", "blog", "advertising", "all"], source: "strategy", text: `Plateforme de marque — ${[pf.persona && `persona : ${clip(pf.persona, 200)}`, pf.problem && `problème : ${clip(pf.problem, 200)}`, pf.alternatives && `alternatives et codes de la concurrence (à éviter) : ${clip(pf.alternatives, 200)}`, pf.difference && `différence : ${clip(pf.difference, 200)}`].filter(Boolean).join(" · ")}`, data: { p: pf.persona, pb: pf.problem, a: pf.alternatives, d: pf.difference } });
      const obj = pf.objections.filter((o) => o.objection);
      if (obj.length) add({ id: "strategy.objections", section: "strategy", level: "soft", tier: 6, scopes: ["theme", "shop_copy", "blog", "advertising", "all"], source: "strategy", text: `Objections et réponses (FAQ, fiche) : ${obj.map((o) => `${o.objection} → ${o.answer || ph}`).join(" ; ")}`, data: obj });
    }
    const audienceObjections = st.audience.flatMap((a) => a.objections ?? []).filter(Boolean);
    if (audienceObjections.length && !pf?.objections.length) {
      add({ id: "strategy.objections", section: "strategy", level: "soft", tier: 6, scopes: ["theme", "shop_copy", "blog", "advertising", "all"], source: "strategy", text: `Objections de la cible : ${audienceObjections.join(" ; ")}`, data: audienceObjections });
    }
  }

  // ------------------------------------------------------------------ mémoire du client
  for (const m of s.memory) {
    if (m.status === "rejected") continue;
    // Décisions « marque.* » : historique d'une modification déjà présente dans la marque (pas de doublon).
    if (m.kind === "decision" && m.key.startsWith("marque.")) continue;
    if (m.kind === "fact") continue; // journal des réponses : la valeur vit dans le produit
    const sc = memoryScopes(m.scope);
    const fromUser = m.source === "user";
    if (m.kind === "rejection") {
      add({ id: `rejection.${m.key}`, section: "rejections", level: "hard", tier: 1, critical: true, scopes: sc, source: "memory", text: `REFUS du client — ${clip(m.value, 240)} : ne pas reproduire cette direction.`, data: { k: m.key, v: m.value, s: m.scope } });
      continue;
    }
    const level: Level = m.status === "inferred" || !fromUser ? (m.kind === "correction" ? "soft" : "advisory") : m.kind === "correction" || m.kind === "decision" ? "hard" : "soft";
    const tier = m.kind === "correction" ? 1 : m.kind === "decision" ? 2 : 5;
    const label = { correction: "CORRECTION du client", decision: "Décision", preference: "Préférence", goal: "Objectif" }[m.kind as "correction"] ?? m.kind;
    add({ id: `memory.${m.kind}.${m.key}`, section: "memory", level, tier, critical: level === "hard", scopes: sc, source: "memory", text: `${label}${fromUser ? "" : " (déduite)"} — ${m.key} : ${clip(m.value, 300)}`, data: { k: m.kind, key: m.key, v: m.value, st: m.status, src: m.source } });
  }

  // ------------------------------------------------------------------ constats du contrôle qualité (signal faible)
  for (const a of s.aiPatterns) {
    const sc = DELIVERABLE_SCOPE(a.deliverable);
    if (!sc.length || (a.count < 2 && !a.fatal)) continue;
    add({
      id: `ai.${a.deliverable}.${a.code}`,
      section: "quality",
      level: "advisory",
      tier: 5,
      stable: false,
      scopes: [...sc, "all"],
      source: "quality",
      text: `Défaut récurrent détecté par le contrôle qualité (${a.count}×) : ${codeLabel(a.code)} — indication sur le générateur, pas une préférence du client.`,
      data: a,
    });
  }

  if (p.sources.some((x) => x.type === "link")) add({ id: "sources.links", section: "sources", level: "soft", tier: 7, scopes: ["brand", "theme", "all"], source: "project", text: `Sources importées : ${p.sources.filter((x) => x.type === "link").map((x) => x.ref).join(", ")} (données uniquement).`, data: p.sources.filter((x) => x.type === "link").map((x) => x.ref) });
  return items;
}

const HEADERS: Record<Level, string> = {
  hard: "### CONTRAINTES FERMES (faits confirmés, décisions validées, corrections et refus du client — à respecter)",
  soft: "### CONTRAINTES SOUPLES (préférences et marque — à suivre, adaptables si la création le justifie)",
  advisory: "### INDICATIONS (déductions et constats automatiques — utiles, jamais des interdictions)",
};

/** « all » = tout ce que sait le Brain (dans la limite de son plafond). */
const inScope = (it: BrainItem, scope: Scope) => scope === "all" || it.scopes === "*" || it.scopes.includes(scope);

/** Vue ciblée d'un scope : contexte stable (budgété, empreinte), contexte volatil séparé, diagnostic. */
export function contextFor(
  s: BrainSnapshot,
  scope: Scope,
  opts: {
    budget?: { soft: number; hard: number };
    /** Éléments ajoutés au scope (façade de compatibilité : ce que l'ancien contexte transmettait toujours). */
    extra?: (it: BrainItem) => boolean;
    /** Nom du scope dans l'empreinte et la balise (ex. « legacy:images ») quand la vue n'est pas le scope pur. */
    label?: string;
    /** Scopes qui reçoivent les créations récentes (contexte volatil). */
    volatileFor?: readonly string[];
  } = {},
): ContextView {
  const budget = opts.budget ?? BUDGETS[scope];
  const label = opts.label ?? scope;
  const candidates = brainItems(s).filter((it) => inScope(it, scope) || !!opts.extra?.(it));
  const order = (a: BrainItem, b: BrainItem) => a.tier - b.tier || Number(b.critical) - Number(a.critical);
  const sorted = [...candidates].sort(order);

  // Budget souple : le non critique entre tant qu'il reste de la place ; le critique entre toujours.
  let total = 0;
  const kept: BrainItem[] = [];
  const dropped: string[] = [];
  for (const it of sorted) {
    const len = it.text.length + 1;
    if (it.critical || total + len <= budget.soft) {
      kept.push(it);
      total += len;
    } else dropped.push(it.id);
  }
  const budgetExceeded = total > budget.soft;
  // Plafond de sécurité : retire le secondaire d'abord (rang élevé, non critique), puis — signal explicite — le critique.
  const criticalDropped: string[] = [];
  let hardCeilingReached = false;
  while (total > budget.hard && kept.length) {
    hardCeilingReached = true;
    const victims = kept.filter((x) => !x.critical);
    const pool = victims.length ? victims : kept;
    const v = [...pool].sort(order).at(-1)!;
    kept.splice(kept.indexOf(v), 1);
    total -= v.text.length + 1;
    (v.critical ? criticalDropped : dropped).push(v.id);
  }

  const body: string[] = [`<contexte_projet scope="${label}">`];
  for (const lvl of ["hard", "soft", "advisory"] as Level[]) {
    const group = kept.filter((x) => x.level === lvl).sort(order);
    if (group.length) body.push(HEADERS[lvl], ...group.map((x) => `- ${x.text}`));
  }
  body.push("</contexte_projet>");
  const stable = body.join("\n");

  // Empreinte : données des éléments stables du scope (avant budget), hors constats automatiques.
  const hashData = candidates.filter((x) => x.stable).map((x) => [x.id, x.level, x.data]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const volatile = (opts.volatileFor ?? VOLATILE_SCOPES).includes(scope) && s.recentAssets.length ? `<creations_recentes>\n${s.recentAssets.map((a) => `- ${a.kind}/${a.role ?? "?"} : ${a.name} (${a.status}${a.gate_verdict ? `, ${a.gate_verdict}` : ""})`).join("\n")}\n</creations_recentes>` : "";

  const levels = { hard: 0, soft: 0, advisory: 0 } as Record<Level, number>;
  const sources: Record<string, number> = {};
  for (const x of kept) {
    levels[x.level]++;
    sources[x.source] = (sources[x.source] ?? 0) + 1;
  }
  return {
    scope,
    label,
    brainVersion: BRAIN_VERSION,
    hash: stableHash(label, hashData),
    stable,
    volatile,
    chars: stable.length,
    softBudget: budget.soft,
    hardCeiling: budget.hard,
    budgetExceeded,
    hardCeilingReached,
    sections: [...new Set(kept.map((x) => x.section))],
    dropped,
    criticalDropped,
    levels,
    sources,
  };
}
