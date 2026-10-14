/**
 * NIVEAU 1 — PLANIFICATION (gratuite, aucune génération payante) : dates de publication (début, fin, jours de la
 * semaine, jours exclus, fuseau), 1 à 5 créneaux par jour, réseaux, répartition des piliers (thèmes prioritaires
 * renforcés, jamais le même pilier deux fois de suite quand c'est possible), formats natifs (répartition demandée),
 * texte local proposé pour chaque publication. Les publications sont enregistrées dans la table `posts` existante
 * (statut « planned » : aucun média encore), avec une clé stable (aucun doublon si la planification est relancée).
 */
import crypto from "node:crypto";
import { fromZonedTime } from "date-fns-tz";
import { all, id, now, one, run, tx } from "../db";
import type { Project } from "../projects";
import { verifiedFacts } from "../seo-v2/facts";
import { researchKeywords } from "../seo-v2/keywords";
import { sitePages } from "../seo-v2/pages";
import { adaptForPlatform, frequencyWarnings, nativeFormatFor, PLATFORM_SPECS, type Platform, type PostFormat } from "./platforms";
import { socialStrategy, type Pillar, type SocialStrategy } from "./strategy";
import { atomsFor, writeLocal, type Atom } from "./copy";
import { contentHash } from "./approval";
import { BANKS, roleAsPillar, rolesFor, weekdayOf, weekIndex, type Goal, type Role } from "./editorial";
import { remember as rememberUse, usedHooks, usesOf } from "./memory";
import { fold } from "../seo-v2/lang";
import { planOfProject } from "../plan-gates";
import { PLANS } from "../plans";

export type FormatKind = "image" | "carousel" | "video" | "text";
export type PlanRequest = {
  startDate: string;
  endDate?: string | null;
  days?: number;
  perDay: number;
  weekdays?: number[];
  slots?: string[];
  timezone: string;
  platforms: { platform: Platform; connectionId?: string | null }[];
  /** « rotate » : chaque créneau sur un réseau, à tour de rôle ; « all » : chaque créneau sur tous les réseaux (adapté). */
  distribution?: "rotate" | "all";
  formatMix?: Partial<Record<FormatKind, number>>;
  priority?: string[];
  exclude?: string[];
  link?: string | null;
  approval?: "each" | "week" | "plan";
  lang?: "fr" | "en";
  /** « weekly » : structure éditoriale par jour de la semaine (Autopilot V2) ; sinon piliers en rotation (historique). */
  structure?: "weekly" | "pillars";
  goal?: Goal;
  /** Niveau de contenu commercial : 0 discret, 1 équilibré, 2 soutenu. */
  commercial?: 0 | 1 | 2;
  /** Produits ou prestations à mettre en avant en priorité (clés du catalogue ou noms). */
  focus?: string[];
};

export const DEFAULT_SLOTS = ["11:30", "18:30", "08:30", "13:00", "21:00"];
const DAY = 86_400_000;

/** Dates de publication (AAAA-MM-JJ) : période, jours de la semaine retenus, jours exclus. */
export function publishingDates(r: Pick<PlanRequest, "startDate" | "endDate" | "days" | "weekdays" | "exclude">): string[] {
  const [y, m, d] = r.startDate.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d);
  let end: number;
  if (r.endDate) {
    const [y2, m2, d2] = r.endDate.split("-").map(Number);
    end = Date.UTC(y2, m2 - 1, d2);
  } else end = start + (Math.max(1, r.days ?? 30) - 1) * DAY;
  if (end < start) throw new Error("la date de fin précède la date de début");
  if ((end - start) / DAY > 366) throw new Error("période limitée à un an");
  const week = new Set(r.weekdays?.length ? r.weekdays : [0, 1, 2, 3, 4, 5, 6]);
  const excluded = new Set(r.exclude ?? []);
  const out: string[] = [];
  for (let t = start; t <= end; t += DAY) {
    const ymd = new Date(t).toISOString().slice(0, 10);
    if (week.has(new Date(t).getUTCDay()) && !excluded.has(ymd)) out.push(ymd);
  }
  return out;
}

/** Instant (UTC, ms) d'une date et d'une heure dans le fuseau du client (heure d'été comprise). */
export const atZoned = (ymd: string, hhmm: string, tz: string) => fromZonedTime(`${ymd}T${hhmm}:00`, tz).getTime();

/** Suite pondérée (« smooth weighted round-robin ») : respecte les parts sans répétition inutile. */
export function weightedSequence<T>(items: { item: T; weight: number }[], n: number, avoidRepeat = true): T[] {
  const cur = items.map(() => 0);
  const total = items.reduce((s, x) => s + x.weight, 0);
  const out: T[] = [];
  for (let k = 0; k < n; k++) {
    items.forEach((x, i) => (cur[i] += x.weight));
    const order = items.map((_, i) => i).sort((a, b) => cur[b] - cur[a]);
    let pick = order[0];
    if (avoidRepeat && out.length && items.length > 1 && items[pick].item === out[out.length - 1]) pick = order[1];
    cur[pick] -= total;
    out.push(items[pick].item);
  }
  return out;
}

export type PlannedSlot = { ymd: string; time: string; at: number; slot: number; platform: Platform; connectionId: string | null; pillar: Pillar; format: PostFormat; groupId: string | null; role?: Role };

/** Grille du calendrier (sans texte) : dates × créneaux × réseaux, pilier et format de chaque publication. */
export function planSlots(req: PlanRequest, strategy: SocialStrategy): { slots: PlannedSlot[]; warnings: string[] } {
  const perDay = Math.max(1, Math.min(5, Math.round(req.perDay)));
  const times = (req.slots?.length ? req.slots : DEFAULT_SLOTS).slice(0, perDay);
  while (times.length < perDay) times.push(DEFAULT_SLOTS[times.length]);
  times.sort();
  const dates = publishingDates(req);
  const platforms = req.platforms.length ? req.platforms : [{ platform: "instagram" as Platform, connectionId: null }];
  const all = req.distribution === "all";
  const count = dates.length * perDay;
  const prio = new Set(req.priority ?? []);
  const pillars = weightedSequence(strategy.pillars.map((p) => ({ item: p, weight: p.share * (prio.has(p.id) ? 1.6 : 1) })), count);
  const mix = req.formatMix && Object.values(req.formatMix).some((v) => (v ?? 0) > 0) ? weightedSequence(Object.entries(req.formatMix).filter(([, v]) => (v ?? 0) > 0).map(([k, v]) => ({ item: k as FormatKind, weight: v! })), count, false) : null;
  const slots: PlannedSlot[] = [];
  let k = 0;
  const weekly = req.structure === "weekly";
  const lang = req.lang ?? "fr";
  for (const ymd of dates) {
    // Structure hebdomadaire : rôles du jour (principale + complémentaires), selon le rythme et l'objectif du client.
    const roles = weekly ? rolesFor(weekdayOf(ymd), perDay, req.goal ?? "balanced", req.commercial ?? 1) : [];
    for (const [s, time] of times.entries()) {
      const role = weekly ? roles[s] : undefined;
      const pillar = role ? roleAsPillar(role, lang) : pillars[k];
      const wanted: PostFormat = mix ? (mix[k] === "video" ? "video" : mix[k]) : pillar.formats[(role ? weekIndex(ymd) : k) % pillar.formats.length];
      const targets = all ? platforms : [platforms[k % platforms.length]];
      const groupId = all && targets.length > 1 ? crypto.createHash("sha1").update(`${ymd}|${time}`).digest("hex").slice(0, 12) : null;
      for (const t of targets) slots.push({ ymd, time, at: atZoned(ymd, time, req.timezone), slot: s, platform: t.platform, connectionId: t.connectionId ?? null, pillar, format: nativeFormatFor(t.platform, wanted), groupId, role });
      k++;
    }
  }
  const perPlatform: Partial<Record<Platform, number>> = {};
  for (const p of platforms) perPlatform[p.platform] = all ? perDay : Math.ceil(perDay / platforms.length);
  return { slots, warnings: frequencyWarnings(perPlatform) };
}

export type PlanResult = { planId: string; created: number; existing: number; dates: number; warnings: string[]; strategy: SocialStrategy };

/**
 * Crée (ou complète) un calendrier V2 : une ligne `posts` par publication, statut « planned », texte local proposé
 * (gratuit), aucun média. Relancer avec le même plan ne crée aucun doublon.
 */
export function createPlanV2(p: Project, req: PlanRequest, o: { planId?: string } = {}): PlanResult {
  const lang = req.lang ?? "fr";
  // Dernier rempart : quel que soit le chemin (route, demande écrite, automatisation), jamais plus de publications par
  // jour que le forfait du projet (Découverte : brouillons de démonstration, rien ne peut être programmé).
  const forfait = planOfProject(p.id);
  const capped = forfait && req.perDay > PLANS[forfait].postsPerDay ? PLANS[forfait].postsPerDay : null;
  if (capped) req = { ...req, perDay: capped };
  const facts = verifiedFacts(p);
  const days = publishingDates(req).length;
  const strategy = socialStrategy(p, { lang, platforms: req.platforms.map((x) => x.platform), startDate: req.startDate, days, perDay: req.perDay, facts });
  const { slots, warnings } = planSlots(req, strategy);
  if (capped) warnings.unshift(lang === "en" ? `limited to ${capped} post(s) per day by your plan` : `limité à ${capped} publication(s) par jour par votre forfait`);
  if (slots.length > 1000) throw new Error("plus de 1000 publications : raccourcissez la période");
  // Questions des clients (recherche SEO V2, hypothèses) : matière des piliers « questions » et « pédagogie ».
  const questions = researchKeywords(p, lang, sitePages(p)).clusters.flatMap((c) => c.questions);
  const planId = o.planId ?? id();
  if (!one("SELECT 1 FROM content_plans WHERE id = ?", planId))
    run("INSERT INTO content_plans (id, project_id, params, strategy, status, created_at, engine, updated_at) VALUES (?,?,?,?,?,?,?,?)", planId, p.id, JSON.stringify(req), JSON.stringify(strategy), "ready", now(), "v2", now());
  // Accroches déjà publiées ou refusées (normalisées sans accents : « Découvrez » = « decouvrez ») : jamais reprises.
  const used = usedHooks(p.id);
  const nth = new Map<string, number>();
  // Structure hebdomadaire : la mémoire fait avancer chaque rôle (matière et tournure) d'une semaine à l'autre.
  const roleUses = usesOf(p.id, "role");
  const items = offerItems(p, facts, req.focus);
  const factsOfItem = new Map<string, typeof facts>();
  const itemFacts = (it: Atom | null) => {
    if (!it || p.business === "services" || !p.catalog.length) return facts;
    const cat = p.catalog.find((c) => c.key === it.key);
    if (!cat) return facts;
    if (!factsOfItem.has(cat.key)) factsOfItem.set(cat.key, verifiedFacts(p, cat));
    return factsOfItem.get(cat.key)!;
  };
  const cta = (pl: Pillar, i: number) => strategy.ctas[(i + (pl.objective === "convert" ? 0 : 1)) % strategy.ctas.length];
  let created = 0;
  let existing = 0;
  // Un même créneau publié sur plusieurs réseaux partage la matière (même idée), adaptée à chaque réseau.
  const groupDraft = new Map<string, ReturnType<typeof writeLocal>>();
  tx(() => {
    for (const [i, s] of slots.entries()) {
      const key = `v2:${planId}:${s.ymd}:${s.time}:${s.platform}`;
      if (one("SELECT 1 FROM posts WHERE publish_key = ?", key)) {
        existing++;
        continue;
      }
      let d = s.groupId ? groupDraft.get(s.groupId) : undefined;
      if (!d) {
        if (s.role) {
          const r = s.role;
          const n = (nth.get(r.id) ?? roleUses.get(r.id) ?? 0);
          nth.set(r.id, n + 1);
          const w = weekIndex(s.ymd);
          const item = items.length ? items[(w + (r.item ?? 0)) % items.length] : null;
          const f = itemFacts(items.length ? items[w % items.length] : null);
          const single = items.length < 2;
          // Matière du rôle : le produit (ou la prestation) de la semaine, le suivant, deux au choix (sondage), ou la
          // matière vérifiée du pilier technique. Un seul produit : on change d'angle (caractéristique), sans inventer.
          let atoms: Atom[] | undefined;
          let tpls = r.tpls;
          if (r.pillarId === "item") {
            if (r.item === 1 && single) {
              atoms = atomsFor({ ...s.pillar, id: "specs" }, strategy.archetype, f, questions);
              tpls = BANKS.zoom;
            } else atoms = item ? [item] : [];
          } else if (r.pillarId === "items") {
            const a = items[w % Math.max(1, items.length)];
            const b = items[(w + 1) % Math.max(1, items.length)];
            atoms = a && b && a.key !== b.key ? [{ key: `${a.key}|${b.key}`, a: a.a, b: b.a, kind: "item" }] : atomsFor({ ...s.pillar, id: "community" }, strategy.archetype, f, questions);
            if (!(a && b && a.key !== b.key)) tpls = BANKS.community;
          } else atoms = atomsFor({ ...s.pillar, id: r.pillarId }, strategy.archetype, f, questions);
          d = writeLocal({ pillar: s.pillar, archetype: strategy.archetype, f, questions, n, lang, cta: cta(s.pillar, n), used, tpls, atoms });
          rememberUse(p.id, "role", r.id);
          rememberUse(p.id, "material", `${r.id}:${d.material}`);
          if (r.pillarId === "item" && item) rememberUse(p.id, "item", item.key);
          rememberUse(p.id, "hook", fold(d.caption.split("\n")[0] ?? ""));
        } else {
          const n = nth.get(s.pillar.id) ?? 0;
          nth.set(s.pillar.id, n + 1);
          d = writeLocal({ pillar: s.pillar, archetype: strategy.archetype, f: facts, questions, n, lang, cta: cta(s.pillar, n), used });
        }
        if (s.groupId) groupDraft.set(s.groupId, d);
      }
      const a = adaptForPlatform(s.platform, { caption: d.caption, title: d.title, hashtags: d.hashtags, link: req.link ?? null, format: s.format, mediaCount: 0 }, lang);
      const pid = id();
      const brief = { kind: d.visual, headline: d.headline, subline: "", layout: "editorial", material: d.material, adapt: a.notes, ...(s.role ? { role: s.role.id, roleKind: s.role.kind, roleTitle: s.role.title[lang] } : {}) };
      const row = { network: s.platform, format: a.format, title: a.title, caption: a.caption, hashtags: a.hashtags.join(" "), link: a.link, media: "[]" };
      run(
        `INSERT INTO posts (id, project_id, plan_id, connection_id, network, format, status, scheduled_at, timezone, title, caption, hashtags, link, angle, media, brief, publish_key, created_at, updated_at, engine, pillar, objective, content_hash, group_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        pid, p.id, planId, s.connectionId, s.platform, a.format, "planned", s.at, req.timezone, a.title, a.caption, row.hashtags, a.link, s.pillar.title, "[]", JSON.stringify(brief), key, now() + i, now() + i, "v2", s.pillar.id, s.pillar.objective, contentHash(row), s.groupId,
      );
      created++;
    }
  });
  const unsupported = req.platforms.filter((x) => PLATFORM_SPECS[x.platform].level !== "ready_to_connect").map((x) => `${PLATFORM_SPECS[x.platform].label} : pas de publication directe depuis le studio (export à publier à la main)`);
  return { planId, created, existing, dates: days, warnings: [...warnings, ...unsupported], strategy };
}

/**
 * Offres à faire tourner semaine après semaine : produits du catalogue (avec leur description), prestations
 * déclarées, ou l'offre principale. Les offres « prioritaires » choisies par le client passent en premier.
 */
export function offerItems(p: Project, f: ReturnType<typeof verifiedFacts>, focus?: string[]): Atom[] {
  const first = (s: string) => (s.split(/(?<=[.!?])\s/)[0] ?? "").trim();
  let list: Atom[] = p.business === "services"
    ? f.services.map((s, i) => ({ key: `svc:${fold(s.name).slice(0, 40) || i}`, a: s.name, b: s.description ? first(s.description) : undefined, kind: "item" as const }))
    : p.catalog.length
      ? p.catalog.map((c) => ({ key: c.key, a: c.name, b: c.description ? first(c.description) : c.features[0], kind: "item" as const }))
      : [{ key: "offer", a: f.offerName, b: f.facts[0] ? `${f.facts[0].label ? `${f.facts[0].label} : ` : ""}${f.facts[0].value}` : undefined, kind: "item" as const }];
  list = list.filter((x) => x.a?.trim());
  if (focus?.length) {
    const want = new Set(focus.map((x) => fold(x)));
    list = [...list.filter((x) => want.has(fold(x.key)) || want.has(fold(x.a))), ...list.filter((x) => !(want.has(fold(x.key)) || want.has(fold(x.a))))];
  }
  return list;
}
