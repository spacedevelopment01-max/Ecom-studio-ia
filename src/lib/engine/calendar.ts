/**
 * Calendrier éditorial : préparation de plusieurs jours de publications
 * complètes (texte, légende, média au bon format, date), puis programmation
 * réelle exécutée par le worker — même navigateur fermé.
 */
import { autopublishAllowed } from "../quotas";
import { fromZonedTime } from "date-fns-tz";
import { loadImage } from "@napi-rs/canvas";
import { all, id, json, now, one, run, tx } from "../db";
import { addUsage, assetData, getAsset, saveAsset, type Asset } from "../library";
import { loadProject, notify, type Project } from "../projects";
import { aiRewritePost, aiSocialPlan, aiSocialRepair, aiSocialReview, lintClaims, lintHollow, scrubClaims, type PostDraft } from "../ai/tasks";
import { placeholder } from "../ai/prompts";
import { llmConfigured } from "../ai/llm";
import { FORMATS, renderCreative, renderServiceCard, type FormatId } from "../media/compose";
import { activityName, activityPhotos, isServices, placeLine, postAmbiance, serviceCta } from "./service-media";
import { brandTypo, ensureCutouts, latestAsset, palette, assetsByRole } from "./images";
import { enqueue, type JobContext } from "../jobs";
import { C, L, contentLang, uiLang } from "../i18n-server";
import { intlLocale } from "../i18n";

/** Format vidéo accepté par chaque réseau (mêmes valeurs que les formats proposés dans l'éditeur de publication). */
export function videoFormat(net: string) {
  return net === "youtube" ? "short" : net === "instagram" ? "reel" : net === "pinterest" ? "pin" : "video";
}
import { contactCta, deName, howToBook, serviceShowcase, unknownText } from "./services-text";
import { cleanTag, keyMoments, normalizePost, NETWORK_RULES, refinePlan, type KeyMoment, type Network } from "./social-quality";

export type PlanParams = {
  startDate: string; // AAAA-MM-JJ (dans le fuseau choisi)
  days: number;
  perDay: number; // 1 à 5
  slots: string[]; // HH:MM
  timezone: string;
  networks: { network: string; connectionId?: string | null }[];
  goals: string;
  tone: string;
  mix: { photo: number; video: number; text: number };
  link?: string;
  approval: "manual" | "auto";
};

export const NETWORK_FORMATS: Record<string, { image: FormatId; video: "9:16" | "1:1" | "4:5" | "16:9"; label: string }> = {
  instagram: { image: "portrait", video: "9:16", label: "Instagram" },
  facebook: { image: "portrait", video: "4:5", label: "Facebook" },
  tiktok: { image: "story", video: "9:16", label: "TikTok" },
  youtube: { image: "landscape", video: "9:16", label: "YouTube" },
  pinterest: { image: "pin", video: "9:16", label: "Pinterest" },
};

/** Hashtag de mots-clés (2 mots utiles au plus) tiré d'un libellé : « Compagnon pour enfant » → « compagnonenfant ». */
function keywordTag(s: string | undefined | null): string {
  const stop = /^(de|du|des|la|le|les|l|d|pour|et|en|a|au|aux|un|une|the|of|for|and|a|an|with|avec)$/i;
  const w = (s ?? "").split(/[\s,'’()/-]+/).filter((x) => x && !stop.test(x)).slice(0, 2).join("");
  return cleanTag(w).toLowerCase();
}

/** Hashtag large et réellement utilisé par secteur (un seul, pour situer la publication). */
const SECTOR_TAG: Record<string, [string, string]> = {
  beaute: ["beaute", "beauty"],
  mode: ["mode", "fashion"],
  bijoux: ["bijoux", "jewelry"],
  maison: ["decoration", "homedecor"],
  hightech: ["hightech", "tech"],
  sport: ["sport", "sports"],
  alimentation: ["gourmandise", "foodie"],
  enfants: ["chambreenfant", "kidsroom"],
  animaux: ["animauxdecompagnie", "petsofinstagram"],
  artisanat: ["papeterie", "stationery"],
};

type Parts = { hook: string; body?: string; cta?: "comment" | "ask" | "save" | "share" | "link" | "none"; question?: boolean };
type LocalAngle = {
  id: string;
  pillar: number;
  fr: string;
  en: string;
  kind: PostDraft["visual"]["kind"];
  layout: PostDraft["visual"]["layout"];
  /** Rédaction ; null si l'angle n'a pas de matière (fait, variante, question) pour cette publication. */
  write: (n: number) => (Parts & { headline: string; slides?: string[]; tag?: string }) | null;
};

/**
 * Plan local (sans IA) d'un produit, construit comme un community manager : piliers de la ligne éditoriale en
 * alternance, séries récurrentes le même jour de la semaine, temps forts réels de la période, accroche → corps →
 * appel à l'interaction varié, format natif de chaque réseau (vidéo, carrousel, photo, Pin), hashtags adaptés.
 * Rien n'est inventé : faits confirmés, variantes, vraies questions de clients ; sinon un seul espace réservé.
 */
export function localPlan(p: Project, params: PlanParams): PostDraft[] {
  if (p.business === "services") return localServicePlan(p, params).map((d) => normalizePost(d, p.brand?.social));
  const name = p.product.name || p.brand?.name || C("notre produit", "our product");
  const brandName = p.brand?.name || name;
  const ok = (t: string) => !lintClaims({ t }, p).length && !lintHollow({ t }).length;
  const facts = p.product.facts.filter((f) => f.status === "confirmed" && f.value && f.value.length < 70 && ok(`${f.label} ${f.value}`));
  const qas = p.product.questions.filter((q) => q.answer?.trim() && q.answer.length <= 200 && ok(`${q.question} ${q.answer}`));
  const variant = p.product.variants.find((v) => v.values.length >= 2);
  const tagline = p.brand?.tagline && ok(p.brand.tagline) ? p.brand.tagline.trim() : "";
  const voice = p.brand?.social;
  const pillarTitles = voice?.pillars?.length === 3 ? voice.pillars.map((x) => x.title) : [C("Le produit en vrai", "The product, for real"), C("Questions et conseils", "Questions and tips"), C("Les coulisses", "Behind the scenes")];
  const series = voice?.series?.length ? voice.series : [{ name: C("Vu de près", "Up close"), idea: "", weekday: 2 }, { name: C("Vos questions", "You asked"), idea: "", weekday: 4 }, { name: C("En coulisses", "Behind the scenes"), idea: "", weekday: 6 }];
  const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  const list = (xs: string[], and: string) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}` : xs[0] ?? "");
  const val = (v: string) => v.replace(/[.!]+$/, "").trim();
  const factLine = (i: number) => {
    const f = facts[i % Math.max(1, facts.length)];
    return f ? `${f.label} : ${val(f.value)}` : "";
  };
  const factLineEn = (i: number) => {
    const f = facts[i % Math.max(1, facts.length)];
    return f ? `${f.label}: ${val(f.value)}` : "";
  };
  const fl = (i: number) => C(factLine(i), factLineEn(i));
  let usedFacts = 0;
  let usedQa = 0;
  const angles: LocalAngle[] = [
    {
      id: "detail",
      pillar: 0,
      fr: "Gros plan",
      en: "Close-up",
      kind: "detail",
      layout: "minimal",
      write: (n) => {
        if (facts.length && usedFacts < facts.length) {
          const f = facts[usedFacts++];
          const hooks = [
            C(`Un détail, un seul : ${lower(f.label)}, ${val(f.value)}.`, `One detail, just one: ${lower(f.label)}, ${val(f.value)}.`),
            C(`Regardez de plus près : ${lower(f.label)}, ${val(f.value)}.`, `Take a closer look: ${lower(f.label)}, ${val(f.value)}.`),
            C(`${f.label} : ${val(f.value)}. C'est écrit petit, alors on vous le montre en grand.`, `${f.label}: ${val(f.value)}. It's small print, so here it is up close.`),
          ];
          return { hook: hooks[n % hooks.length], body: n % hooks.length === 2 ? undefined : C(`${name}, vu de près.`, `${name}, up close.`), cta: "save", headline: shortLine(val(f.value), 32) || C("Vu de près", "Up close") };
        }
        const hooks = [
          { hook: C(`Le détail qu'on ne remarque pas tout de suite : ${placeholder(contentLang(), "le détail que montre la photo")}.`, `The detail you don't notice at first: ${placeholder(contentLang(), "the detail the photo shows")}.`), headline: C("Vu de près", "Up close") },
          { hook: C(`Zoom sur ${name} : ${placeholder(contentLang(), "ce que montre le gros plan")}.`, `Zooming in on ${name}: ${placeholder(contentLang(), "what the close-up shows")}.`), headline: C("Zoom", "Zoom in") },
          { hook: C(`Ce qu'une photo de loin ne montre pas : ${placeholder(contentLang(), "le détail en gros plan")}.`, `What a wide shot can't show: ${placeholder(contentLang(), "the close-up detail")}.`), headline: C("Le détail qui compte", "The detail that counts") },
        ];
        const h = hooks[n % hooks.length];
        return { hook: h.hook, cta: "save", headline: h.headline };
      },
    },
    {
      id: "points",
      pillar: 0,
      fr: "L'essentiel en quelques points",
      en: "The essentials",
      kind: "creative",
      layout: "bold",
      write: (n) => {
        if (facts.length < 2) return null;
        const pick = facts.slice(0, 4);
        const lines = pick.map((f) => C(`→ ${f.label} : ${val(f.value)}`, `→ ${f.label}: ${val(f.value)}`));
        const hook = n % 2 ? C(`Ce qu'il faut savoir sur ${name}, en ${pick.length} points.`, `What to know about ${name}, in ${pick.length} points.`) : C(`${name} en ${pick.length} points, sans détour.`, `${name} in ${pick.length} points, straight up.`);
        return {
          hook,
          body: lines.join("\n"),
          cta: "save",
          headline: C(`L'essentiel en ${pick.length} points`, `${pick.length} things to know`),
          slides: [C(`L'essentiel en ${pick.length} points`, `${pick.length} things to know`), ...pick.map((f) => shortLine(C(`${f.label} : ${val(f.value)}`, `${f.label}: ${val(f.value)}`), 40)), C("À enregistrer pour plus tard", "Save it for later")],
        };
      },
    },
    {
      id: "vote",
      pillar: 1,
      fr: "Le choix de la communauté",
      en: "Community pick",
      kind: "creative",
      layout: "centered",
      write: () => {
        if (!variant) return null;
        const [a, b] = variant.values;
        return { hook: C(`${a} ou ${b} : vous prendriez lequel ?`, `${a} or ${b}: which one would you pick?`), body: C(`${name} existe en ${list(variant.values, "et")}, avec les mêmes détails.`, `${name} comes in ${list(variant.values, "and")}, same details on each.`), cta: "comment", question: true, headline: shortLine(`${a} ${C("ou", "or")} ${b} ?`, 32) };
      },
    },
    {
      id: "question",
      pillar: 1,
      fr: "Question à la communauté",
      en: "Ask the community",
      kind: "creative",
      layout: "centered",
      write: (n) => {
        const qs = [
          { hook: C(`Pour vous ou pour offrir ? On est curieux.`, `For you or as a gift? We're curious.`), headline: C("Pour vous ou pour offrir ?", "For you or a gift?") },
          { hook: C(`La première chose que vous regardez sur ${name} : la couleur, la forme ou la matière ?`, `The first thing you notice on ${name}: the color, the shape or the material?`), headline: C("Couleur, forme ou matière ?", "Color, shape or material?") },
          { hook: C(`Comment l'utiliseriez-vous au quotidien ?`, `How would you use it day to day?`), headline: C("Et chez vous ?", "And at your place?") },
          { hook: C(`Si vous deviez décrire ${name} en un mot, ce serait lequel ?`, `If you had to sum up ${name} in one word, what would it be?`), headline: C("En un mot ?", "In one word?") },
          { hook: C(`Qu'aimeriez-vous voir de plus près la prochaine fois ?`, `What would you like to see up close next time?`), headline: C("À vous de choisir", "Your call") },
        ];
        const q = qs[n % qs.length];
        return { hook: q.hook, body: C(`Votre réponse nous aide à choisir ce que l'on montre ensuite.`, `Your answer helps us choose what we show next.`), cta: "comment", question: true, headline: q.headline };
      },
    },
    {
      id: "faq",
      pillar: 1,
      fr: "Vos questions",
      en: "You asked",
      kind: "creative",
      layout: "editorial",
      write: () => {
        if (qas.length && usedQa < qas.length) {
          const q = qas[usedQa++];
          const question = q.question.replace(/\s*\?*$/, "");
          const answer = q.answer!.trim().replace(/^(\p{Lu})(\p{Ll})/u, (_m, a: string, b: string) => a.toLowerCase() + b);
          const asked = C(`${question} ?`, `${question}?`);
          return { hook: C(`« ${question} ? » Bonne question.`, `"${question}?" Good question.`), body: C(`Notre réponse : ${answer}`, `Our answer: ${answer}`), cta: "ask", headline: asked.length <= 32 ? asked : C("La question de la semaine", "Question of the week") };
        }
        return { hook: C(`Une question qu'on nous pose : ${placeholder(contentLang(), "une vraie question de client et sa réponse vérifiée")}`, `A question we get: ${placeholder(contentLang(), "a real customer question and its verified answer")}`), cta: "ask", headline: C("Vos questions", "You asked") };
      },
    },
    {
      id: "coulisses",
      pillar: 2,
      fr: "Coulisses de la marque",
      en: "Behind the brand",
      kind: "scene",
      layout: "split",
      write: (n) => {
        const hooks = [
          { hook: C(`Ce que vous ne voyez pas sur la fiche produit : ${placeholder(contentLang(), "ce que montre la photo des coulisses")}.`, `What the product page doesn't show: ${placeholder(contentLang(), "what the behind-the-scenes photo shows")}.`), headline: C("En coulisses", "Behind the scenes") },
          { hook: C(`Chez ${brandName}, avant la photo, il y a ceci : ${placeholder(contentLang(), "une étape de préparation, de choix ou d'emballage")}.`, `At ${brandName}, before the photo, there's this: ${placeholder(contentLang(), "a step of prep, selection or packing")}.`), headline: C("Avant la photo", "Before the photo") },
          { hook: C(`Une étape qu'on montre rarement : ${placeholder(contentLang(), "ce que montre la photo")}.`, `A step we rarely show: ${placeholder(contentLang(), "what the photo shows")}.`), headline: C(`Chez ${brandName}`, `At ${brandName}`) },
        ];
        const h = hooks[n % hooks.length];
        return { hook: h.hook, cta: n % 2 ? "share" : "comment", body: n % 2 ? undefined : C(`Quelle étape voulez-vous voir la prochaine fois ?`, `Which step should we show next?`), question: n % 2 === 0, headline: h.headline };
      },
    },
    {
      id: "piece",
      pillar: 0,
      fr: "La pièce entière",
      en: "The full piece",
      kind: "packshot",
      layout: "minimal",
      write: (n) => {
        const f = facts.length ? fl(n + 1) : "";
        const hooks = [
          ...(tagline ? [{ hook: `${tagline.replace(/[.!]+$/, "")}.`, headline: shortLine(tagline, 32) }] : []),
          { hook: C(`${name}, de face, sans artifice.`, `${name}, front on, nothing added.`), headline: shortLine(name, 32) },
          { hook: C(`${name}, en entier, tel qu'il est.`, `${name}, the whole thing, as it is.`), headline: C("Tel qu'il est", "As it is") },
        ];
        const h = hooks[n % hooks.length];
        return { hook: h.hook, body: f ? `${f}.` : undefined, cta: "link", headline: h.headline };
      },
    },
    {
      id: "motion",
      pillar: 0,
      fr: "En mouvement",
      en: "In motion",
      kind: "video",
      layout: "editorial",
      write: (n) => {
        const f = facts.length ? fl(n) : "";
        return { hook: n % 2 ? C(`Quelques secondes pour faire le tour de ${name}.`, `A few seconds to see all of ${name}.`) : C(`${name}, sous tous les angles.`, `${name}, from every angle.`), body: f ? `${f}.` : undefined, cta: "share", headline: C("Regardez bien", "Watch closely") };
      },
    },
  ];
  const byId = Object.fromEntries(angles.map((a) => [a.id, a])) as Record<string, LocalAngle>;
  // Séries : nom de la série → angle qui la nourrit (par position : détail, questions, coulisses).
  const seriesAngle = ["detail", "faq", "coulisses"];
  const moments = keyMoments(params.startDate, params.days, p.product.sector);
  const [y, m, d] = params.startDate.split("-").map(Number);
  const weekday = (day: number) => new Date(Date.UTC(y, m - 1, d + day)).getUTCDay();

  const posts: PostDraft[] = [];
  const counters: Record<string, number> = {};
  const used = new Set<string>();
  let k = 0;
  let pillar = 0;
  let prevAngle = "";
  let accVideo = 0;
  let accText = 0;
  let ctaTurn = 0;
  for (let day = 0; day < params.days; day++) {
    for (let slot = 0; slot < params.perDay; slot++) {
      const net = params.networks[(day * params.perDay + slot) % params.networks.length].network as Network;
      // Format visé : vidéo et carrousel répartis selon le mix demandé (réseaux vidéo : toujours vidéo).
      // Le quota non servi (série du jour prioritaire, réseau sans carrousel) est reporté à la publication suivante.
      let want: "video" | "carousel" | "image" = "image";
      if (net === "tiktok" || net === "youtube") want = "video";
      else if (net !== "pinterest") {
        accVideo += params.mix.video / 100;
        accText += params.mix.text / 100;
        const carouselDue = accText >= 1 && net === "instagram" && facts.length >= 2;
        if (accVideo >= 1 && !(carouselDue && accText >= accVideo)) want = "video";
        else if (carouselDue) want = "carousel";
      }
      // Choix de l'angle : temps fort du jour, sinon série du jour, sinon pilier suivant (jamais deux fois le même angle).
      const moment = slot === 0 ? moments.find((x) => x.day === day) : undefined;
      const s = slot === 0 ? series.findIndex((x) => x.weekday === weekday(day)) : -1;
      const candidates: string[] = [];
      if (want === "carousel") candidates.push("points");
      if (s >= 0 && s < seriesAngle.length) candidates.push(seriesAngle[s]);
      if (want === "video") candidates.push("motion");
      const pillarAngles = angles.filter((a) => a.pillar === pillar % 3 && a.id !== "motion" && a.id !== "points");
      candidates.push(...pillarAngles.map((a) => a.id), ...angles.map((a) => a.id));
      // Pinterest est un moteur de recherche : objet, détails, idées ; pas de question à commenter ni de coulisses.
      // La vidéo disponible montre le produit : jamais de coulisses ni de question de client « en vidéo » (légende fausse).
      const videoOk = (id: string) => ["motion", "vote", "question", "piece"].includes(id) || id.startsWith("moment");
      const allowed = (id: string) => (net === "pinterest" ? ["piece", "detail", "points"].includes(id) : net === "tiktok" || net === "youtube" ? videoOk(id) : true);
      let chosen: { a: LocalAngle; w: NonNullable<ReturnType<LocalAngle["write"]>> } | null = null;
      if (moment) chosen = { a: { id: `moment-${moment.id}`, pillar: 0, fr: `Temps fort (${moment.label})`, en: `Key moment (${moment.label})`, kind: "creative", layout: "centered", write: () => null }, w: momentPost(moment, name, facts.length ? fl(k) : "") };
      for (const id of candidates) {
        if (chosen) break;
        const a = byId[id];
        if (!a || a.id === prevAngle || !allowed(a.id)) continue;
        const n = counters[a.id] ?? 0;
        const w = a.write(n);
        if (!w) continue;
        const key = norm(w.hook);
        if (used.has(key)) continue;
        counters[a.id] = n + 1;
        chosen = { a, w };
      }
      // Tout a déjà servi (plan long) : l'angle le moins utilisé, jamais celui de la veille.
      if (!chosen) {
        const pool = angles.filter((a) => a.id !== prevAngle && allowed(a.id)).sort((x, y) => (counters[x.id] ?? 0) - (counters[y.id] ?? 0));
        for (const a of pool) {
          const n = counters[a.id] ?? 0;
          const w = a.write(n);
          if (!w) continue;
          counters[a.id] = n + 1;
          chosen = { a, w };
          break;
        }
        if (!chosen) chosen = { a: byId.piece, w: byId.piece.write(counters.piece = (counters.piece ?? 0) + 1)! };
      }
      const { a, w } = chosen;
      used.add(norm(w.hook));
      prevAngle = a.id;
      pillar = a.id.startsWith("moment") ? pillar : a.pillar + 1;
      const seriesName = s >= 0 && seriesAngle[s] === a.id ? series[s].name : undefined;
      const isVideo = a.kind === "video" || (want === "video" && videoOk(a.id));
      const format: PostDraft["format"] = isVideo ? (videoFormat(net) as PostDraft["format"]) : net === "pinterest" ? "pin" : a.id === "points" && w.slides && net === "instagram" ? "carousel" : "image";
      if (isVideo && net !== "tiktok" && net !== "youtube" && net !== "pinterest") accVideo = Math.max(0, accVideo - 1);
      if (format === "carousel") accText = Math.max(0, accText - 1);
      // Appel à l'interaction : celui de l'angle, varié ; une question posée dans l'accroche suffit.
      const ctas = { comment: C(`Dites-le-nous en commentaire.`, `Tell us in the comments.`), ask: C("Une autre question ? Posez-la en commentaire.", "Got another question? Ask it in the comments."), save: [C("Enregistrez la publication pour la retrouver.", "Save this post for later."), C("À garder sous le coude : enregistrez-la.", "Worth keeping: save it.")][ctaTurn % 2], share: [C("Envoyez-la à quelqu'un à qui elle plairait.", "Send this to someone who'd like it."), C("Partagez-la à la personne à qui vous pensez.", "Share it with the person you're thinking of.")][ctaTurn % 2], link: params.link ? (NETWORK_RULES[net].link ? C(`À découvrir ici : ${params.link}`, `Take a look: ${params.link}`) : C("Tout est dans le lien en bio.", "It's all at the link in bio.")) : C("Une question ? Posez-la en commentaire.", "Questions? Ask in the comments."), none: "" } as const;
      ctaTurn++;
      const cta = ctas[w.cta ?? "comment"];
      const hook = w.hook;
      const body = w.body ?? "";
      let caption: string;
      let title: string;
      if (net === "tiktok") {
        caption = [hook, w.question ? "" : cta].filter(Boolean).join(" ");
        title = C(`${name} : ${lower(C<string>(a.fr, a.en))}`, `${name}: ${lower(a.en)}`);
      } else if (net === "youtube") {
        title = shortLine(`${name} : ${lower(C<string>(a.fr, a.en))}`, 95);
        caption = [hook, body, params.link ? params.link : ""].filter(Boolean).join("\n");
      } else if (net === "pinterest") {
        title = shortLine(p.product.category && norm(p.product.category) !== norm(name) ? C(`${name}, ${lower(p.product.category)} ${brandName}`, `${name}, ${lower(p.product.category)} by ${brandName}`) : C(`${name} ${brandName}`, `${name} by ${brandName}`), 95);
        // Description de recherche d'un seul tenant : listes à puces mises en ligne.
        const flat = (a.id === "detail" ? "" : body).replace(/^→\s*/, "").replace(/\n→\s*/g, " ; ").replace(/\n+/g, " ");
        caption = [hook, flat ? `${flat.replace(/[.;\s]+$/, "")}.` : "", p.product.category ? C(`${p.product.category} signé ${brandName}.`, `${p.product.category} by ${brandName}.`) : "", params.link ? C(`À découvrir : ${params.link}`, `See more: ${params.link}`) : ""].filter(Boolean).join(" ");
      } else if (net === "facebook") {
        title = C(`${name} : ${lower(C<string>(a.fr, a.en))}`, `${name}: ${lower(a.en)}`);
        caption = [`${hook}${body ? ` ${body.replace(/\n/g, " ")}` : ""}`, cta, w.cta !== "link" && params.link ? params.link : ""].filter(Boolean).join("\n\n");
      } else {
        title = C(`${name} : ${lower(C<string>(a.fr, a.en))}`, `${name}: ${lower(a.en)}`);
        caption = [hook, body, cta].filter(Boolean).join("\n\n");
      }
      // Hashtags : marque, mots-clés du produit, secteur et sujet du jour, dans un ordre qui tourne (jamais le même jeu partout).
      const sectorTag = SECTOR_TAG[p.product.sector ?? ""]?.[contentLang() === "en" ? 1 : 0];
      const topical = [w.tag, a.id === "coulisses" ? C("coulisses", "behindthescenes") : ""].filter(Boolean) as string[];
      const pool = [keywordTag(p.product.category), sectorTag, keywordTag(p.product.name !== brandName ? p.product.name : ""), ...topical].filter((t): t is string => !!t && t.length > 2);
      const rot = pool.length ? k % pool.length : 0;
      const hashtags = [cleanTag(brandName).toLowerCase(), ...pool.slice(rot), ...pool.slice(0, rot)].filter(Boolean);
      posts.push(
        normalizePost(
          {
            day,
            slot,
            network: net,
            format,
            angle: C<string>(a.fr, a.en),
            pillar: a.id.startsWith("moment") ? undefined : pillarTitles[a.pillar],
            series: seriesName,
            title,
            caption,
            hashtags,
            visual: { kind: isVideo ? "video" : a.kind, headline: shortLine(w.headline, 32), subline: "", layout: a.layout, slides: format === "carousel" ? w.slides : undefined },
          },
          voice,
        ),
      );
      k++;
    }
  }
  return posts;
}

/** Publication d'un temps fort : une occasion de parler du produit, jamais une promotion. */
function momentPost(m: KeyMoment, name: string, fact: string): Parts & { headline: string; tag?: string } {
  const label = m.label;
  switch (m.id) {
    case "noel":
      return { hook: C(`Une idée pour la liste de Noël : ${name}.`, `One for the Christmas list: ${name}.`), body: fact ? `${fact}.` : undefined, cta: "save", headline: C("Pour la liste de Noël", "For the Christmas list"), tag: C("ideecadeau", "giftideas") };
    case "halloween":
      return { hook: C(`Halloween approche : quel déguisement cette année ?`, `Halloween is coming: what's the costume this year?`), body: C(`Sorcière, fantôme ou citrouille, on veut tout savoir.`, `Witch, ghost or pumpkin, we want to hear it all.`), cta: "comment", question: true, headline: C("Et vous, en quoi ?", "What's your costume?"), tag: "halloween" };
    case "rentree":
      return { hook: C(`La rentrée arrive : ${name} est sur la liste ?`, `Back to school is coming: is ${name} on the list?`), body: fact ? `${fact}.` : undefined, cta: "comment", question: true, headline: C("Prêts pour la rentrée ?", "Ready for school?"), tag: C("rentree", "backtoschool") };
    default:
      return { hook: C(`Une idée pour ${label} : ${name}.`, `An idea for ${label}: ${name}.`), body: fact ? `${fact}.` : undefined, cta: "share", headline: shortLine(C(`Pour ${label}`, `For ${label}`), 32), tag: C("ideecadeau", "giftideas") };
  }
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Plan local d'une entreprise de services : coulisses, réalisations (avant / après) ou déroulé d'un rendez-vous,
 * conseils d'expert, présentation de l'équipe, focus sur une prestation, rappel de prise de rendez-vous.
 * Les informations manquantes restent en espaces réservés ; aucun tarif, délai, avis ni résultat n'est inventé.
 */
function localServicePlan(p: Project, params: PlanParams): PostDraft[] {
  const profile = p.services;
  const offer = (profile?.services ?? []).filter((x) => x.name.trim());
  const brand = p.brand?.name || p.product.name || p.name || C("notre équipe", "our team");
  const activity = p.product.name || brand;
  const cta = contactCta(profile?.contactMode);
  const book = howToBook(profile);
  const where = profile?.area?.trim() || profile?.address?.trim() || "";
  const hours = profile?.hours?.trim() || "";
  const more = params.link ? C(`\n${cta} : ${params.link}`, `\n${cta}: ${params.link}`) : "";
  const showcase = serviceShowcase(p.product);
  type Angle = { fr: string; en: string; kind: PostDraft["visual"]["kind"]; layout: PostDraft["visual"]["layout"]; caption: (i: number) => string; headline: (i: number) => string };
  const service = (i: number) => offer[i % Math.max(1, offer.length)];
  const angles: Angle[] = [
    {
      fr: "Focus prestation",
      en: "Service spotlight",
      kind: "creative",
      layout: "editorial",
      caption: (i) => {
        const x = service(i);
        if (!x) return C(`Ce que nous faisons, en clair : ${unknownText("prestation à présenter", "service to present")}.`, `What we do, in plain words: ${unknownText("prestation à présenter", "service to present")}.`) + more;
        const extra = [x.duration?.trim(), x.price?.trim()].filter(Boolean).join(" · ");
        return `${x.name}${extra ? ` (${extra})` : ""}${C(" : ", ": ")}${x.description?.trim() || unknownText(`ce que comprend « ${x.name} »`, `what "${x.name}" includes`)}` + more;
      },
      headline: (i) => service(i)?.name ?? activity,
    },
    {
      fr: "Coulisses",
      en: "Behind the scenes",
      kind: "scene",
      layout: "split",
      caption: () => C(`Dans les coulisses ${deName(brand)} : ${unknownText("ce que montre la photo (préparation, outils, lieu)", "what the photo shows (preparation, tools, place)")}.`, `Behind the scenes at ${brand}: ${unknownText("ce que montre la photo (préparation, outils, lieu)", "what the photo shows (preparation, tools, place)")}.`),
      headline: () => C("Dans les coulisses", "Behind the scenes"),
    },
    showcase
      ? {
          fr: "Avant / après",
          en: "Before and after",
          kind: "scene",
          layout: "editorial",
          caption: () => C(`Avant, après : une réalisation ${deName(brand)}. ${unknownText("nature et lieu de la réalisation, avec l'accord du client", "what was done and where, with the client's consent")}`, `Before and after: a project by ${brand}. ${unknownText("nature et lieu de la réalisation, avec l'accord du client", "what was done and where, with the client's consent")}`) + more,
          headline: () => C("Avant / après", "Before / after"),
        }
      : {
          fr: "Comment se passe un rendez-vous",
          en: "What an appointment looks like",
          kind: "creative",
          layout: "centered",
          caption: () => C(`Premier rendez-vous chez ${brand} ? Voici comment ça se passe. ${unknownText("étapes du rendez-vous", "steps of the appointment")}\n${book}`, `First appointment with ${brand}? Here's how it works. ${unknownText("étapes du rendez-vous", "steps of the appointment")}\n${book}`),
          headline: () => C("Comment ça se passe", "How it works"),
        },
    {
      fr: "Conseil d'expert",
      en: "Expert tip",
      kind: "creative",
      layout: "bold",
      caption: () => C(`Le conseil ${deName(brand)} : ${unknownText("un conseil concret de votre métier", "a practical tip from your trade")}.`, `A tip from ${brand}: ${unknownText("un conseil concret de votre métier", "a practical tip from your trade")}.`),
      headline: () => C("Le conseil du pro", "Pro tip"),
    },
    {
      fr: "Présentation de l'équipe",
      en: "Meet the team",
      kind: "scene",
      layout: "split",
      caption: () => C(`Derrière ${brand}, il y a ${unknownText("prénom et rôle des personnes présentées, avec leur accord", "first name and role of the people shown, with their consent")}.`, `Behind ${brand}: ${unknownText("prénom et rôle des personnes présentées, avec leur accord", "first name and role of the people shown, with their consent")}.`),
      headline: () => C("L'équipe", "The team"),
    },
    {
      fr: "Prise de rendez-vous",
      en: "Book your appointment",
      kind: "creative",
      layout: "centered",
      caption: () => [book, where ? C(`Où : ${where}.`, `Where: ${where}.`) : "", hours ? C(`Horaires : ${hours}.`, `Hours: ${hours}.`) : ""].filter(Boolean).join("\n") + (params.link ? `\n${params.link}` : ""),
      headline: () => cta,
    },
    {
      fr: "Question à la communauté",
      en: "Ask the community",
      kind: "creative",
      layout: "centered",
      caption: () => C(`Une question sur ${offer[0] ? `« ${offer[0].name} »` : "nos prestations"} ? Posez-la en commentaire.`, `Got a question about ${offer[0] ? `"${offer[0].name}"` : "our services"}? Ask it in the comments.`),
      headline: () => C("Vos questions", "Your questions"),
    },
  ];
  // Mots-clés courts : marque, métier (premier mot), ville, et métier + ville.
  const word = (t?: string) => (t ?? "").trim().split(/[\s,(/]+/)[0] ?? "";
  const trade = word(p.product.category);
  const city = [word(profile?.area), ...(profile?.address ?? "").split(",").reverse().map((x) => x.replace(/\d+/g, "").trim())].find((x) => x && /\p{L}{3}/u.test(x)) ?? "";
  const tags = [p.brand?.name, trade, city, trade && city ? `${trade}${city}` : ""].filter(Boolean).map((t) => String(t).replace(/[^\p{L}\p{N}]+/gu, "")).filter((t) => t.length > 1);
  const posts: PostDraft[] = [];
  let k = 0;
  let accVideo = 0;
  for (let day = 0; day < params.days; day++) {
    for (let slot = 0; slot < params.perDay; slot++) {
      const net = params.networks[(day * params.perDay + slot) % params.networks.length].network as PostDraft["network"];
      const a = angles[k % angles.length];
      // Vidéo répartie selon le mix demandé (réseaux vidéo : toujours vidéo).
      let wantsVideo = net === "tiktok" || net === "youtube";
      if (!wantsVideo && net !== "pinterest") {
        accVideo += params.mix.video / 100;
        if (accVideo >= 1) {
          wantsVideo = true;
          accVideo -= 1;
        }
      }
      const angle = C<string>(a.fr, a.en);
      const headline = a.headline(k).slice(0, 40);
      posts.push({
        day,
        slot,
        network: net,
        format: wantsVideo ? videoFormat(net) : net === "pinterest" ? "pin" : "image",
        angle,
        title: C(`${brand} : ${angle.toLowerCase()}`, `${brand}: ${angle.toLowerCase()}`),
        caption: a.caption(k),
        hashtags: [...new Set(tags)].slice(0, NETWORK_RULES[net]?.tags[1] ?? 4),
        visual: { kind: wantsVideo ? "video" : a.kind, headline, subline: where && a.kind === "creative" ? where.slice(0, 40) : "", layout: a.layout },
      });
      k++;
    }
  }
  return posts;
}

/**
 * Contrôle des publications rédigées par l'IA : allégations non confirmées (livraison, sécurité, santé, avis…),
 * formules creuses et longueurs. Une publication fautive est réécrite une fois ; si le défaut persiste, elle garde
 * la mention des points à vérifier et ne peut pas partir sans validation humaine.
 */
export async function checkPostDrafts(
  drafts: PostDraft[],
  p: Project,
  rewrite: (post: PostDraft, issues: string[]) => Promise<{ title: string; caption: string; hashtags: string[] }>,
): Promise<(PostDraft & { claims?: string[] })[]> {
  const issuesOf = (d: Pick<PostDraft, "title" | "caption" | "visual">) => [
    ...lintClaims({ title: d.title, caption: d.caption, headline: d.visual.headline, subline: d.visual.subline, slides: d.visual.slides ?? [] }, p).map((c) => L(`« ${c.term} » (${c.label})`, `"${c.term}" (${c.label})`)),
    ...lintHollow({ title: d.title, caption: d.caption, headline: d.visual.headline }).map((h) => L(`formule creuse « ${h.term} »`, `empty phrase "${h.term}"`)),
  ];
  const out: (PostDraft & { claims?: string[] })[] = [];
  let rewrites = 0;
  for (const d of drafts) {
    // Titre de visuel lisible sur téléphone : 6 mots au plus, coupé à un mot entier.
    const visual = { ...d.visual, headline: shortLine(d.visual.headline, 40), subline: shortLine(d.visual.subline, 60) };
    let post: PostDraft = { ...d, visual };
    let issues = issuesOf(post);
    // Au plus 12 réécritures par calendrier (coût maîtrisé) ; au-delà, la publication reste signalée.
    if (issues.length && rewrites < 12) {
      rewrites++;
      try {
        const r = await rewrite(post, issues);
        const next = { ...post, title: r.title, caption: r.caption, hashtags: r.hashtags.map((h) => h.replace(/^#+/, "").replace(/\s+/g, "")).filter(Boolean).slice(0, 10) };
        const left = issuesOf(next);
        if (left.length < issues.length) {
          post = next;
          issues = left;
        }
      } catch {
        // Réécriture impossible : la publication reste signalée.
      }
    }
    // Les allégations encore présentes sont retirées du texte ; la publication garde la mention « à vérifier »
    // et attend une validation humaine (une formule creuse seule ne bloque pas la programmation).
    const scrub = scrubClaims({ title: post.title, caption: post.caption, headline: post.visual.headline, subline: post.visual.subline, slides: post.visual.slides ?? [] }, p);
    if (scrub.removed.length) {
      const c = scrub.content;
      post = { ...post, title: c.title, caption: c.caption, visual: { ...post.visual, headline: c.headline, subline: c.subline, slides: post.visual.slides ? c.slides : undefined } };
      out.push({ ...post, claims: [...new Set(scrub.removed.map((r) => L(`« ${r.term} » (${r.label})`, `"${r.term}" (${r.label})`)))].slice(0, 6) });
    } else out.push(post);
  }
  return out;
}

/**
 * Réécriture d'une publication depuis l'éditeur : la version de l'IA passe par la même normalisation (format,
 * hashtags, emojis, lien) et le même contrôle des allégations que le calendrier ; une allégation persistante est
 * retirée et la publication repasse en relecture.
 */
export async function rewritePostChecked(
  post: { network: string; format: string; title: string; caption: string; angle: string; brief?: string | null },
  p: Project,
  rewrite: (instruction: string | null) => Promise<{ title: string; caption: string; hashtags: string[] }>,
): Promise<PostDraft & { claims?: string[] }> {
  const r = await rewrite(null);
  const visual = json<PostDraft["visual"]>(post.brief ?? "{}", { kind: "creative", headline: "", subline: "", layout: "editorial" });
  const draft = normalizePost({ day: 0, slot: 0, network: post.network as Network, format: post.format as PostDraft["format"], angle: post.angle ?? "", title: r.title, caption: r.caption, hashtags: r.hashtags, visual: { kind: visual.kind ?? "creative", headline: visual.headline ?? "", subline: visual.subline ?? "", layout: visual.layout ?? "editorial", slides: visual.slides } }, p.brand?.social);
  const [checked] = await checkPostDrafts([draft], p, (_d, issues) =>
    rewrite(L(`Retire ces allégations non confirmées (ou remplace-les par « ${placeholder(contentLang())} ») : ${issues.join(" ; ")}. Garde l'angle et le ton.`, `Remove these unconfirmed claims (or replace them with "${placeholder(contentLang())}"): ${issues.join("; ")}. Keep the angle and tone.`)),
  );
  return checked;
}

/** Ligne courte coupée à un mot entier (jamais au milieu d'un mot). */
export function shortLine(s: string, max: number): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1).replace(/\s+\S*$/, "").replace(/[\s,;:.!?·–—-]+$/, "");
  return cut || t.slice(0, max);
}

/** Dates, jours et horaires du plan, donnés à l'IA (les horaires sont ceux choisis par le client). */
export function scheduleLines(params: PlanParams): string {
  const [y, m, d] = params.startDate.split("-").map(Number);
  const days = Math.min(params.days, 60);
  return Array.from({ length: days }, (_, day) => {
    const date = new Date(Date.UTC(y, m - 1, d + day));
    const label = date.toLocaleDateString(contentLang() === "en" ? "en-US" : "fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    return `- day ${day} : ${label} · ${params.slots.slice(0, params.perDay).map((t, slot) => `slot ${slot} à ${t}`).join(", ")}`;
  }).join("\n");
}

/** Temps forts réels de la période (pour l'IA). */
function momentsLine(p: Project, params: PlanParams): string {
  if (p.business === "services") return "";
  return keyMoments(params.startDate, params.days, p.product.sector).map((m) => `${m.label} le ${m.date} (à évoquer au plus tôt le day ${m.day}, une seule publication)`).join(" ; ");
}

/** Accroches des publications récentes du projet (hors ce plan) : à ne pas répéter. */
function recentHooks(projectId: string, planId: string): string[] {
  const rows = all<{ caption: string }>("SELECT caption FROM posts WHERE project_id = ? AND (plan_id IS NULL OR plan_id != ?) AND status NOT IN ('cancelled') ORDER BY scheduled_at DESC LIMIT 20", projectId, planId);
  return [...new Set(rows.map((r) => (r.caption ?? "").split("\n").find((l) => l.trim())?.trim().slice(0, 140) ?? "").filter(Boolean))].slice(0, 15);
}

/** Stratégie du plan préparé par le studio (sans IA) : piliers, séries, temps forts, ce qu'il reste à compléter. */
export function localStrategy(p: Project, params: PlanParams, posts: PostDraft[]): string {
  const pillars = [...new Set(posts.map((x) => x.pillar).filter(Boolean))];
  const series = [...new Set(posts.map((x) => x.series).filter(Boolean))];
  const moments = p.business === "services" ? [] : keyMoments(params.startDate, params.days, p.product.sector).map((m) => m.label);
  const formats = [...new Set(posts.map((x) => x.format))];
  const todo = posts.filter((x) => /\[(À compléter|To complete)/.test(x.caption)).length;
  return [
    L("Plan préparé par le studio (version sans IA), à partir des seules informations confirmées.", "Plan prepared by the studio (non-AI version), using confirmed information only."),
    pillars.length ? L(`Piliers en alternance : ${pillars.join(", ")}.`, `Alternating pillars: ${pillars.join(", ")}.`) : "",
    series.length ? L(`Séries récurrentes : ${series.join(", ")}.`, `Recurring series: ${series.join(", ")}.`) : "",
    moments.length ? L(`Temps forts de la période : ${moments.join(", ")} (sans promotion inventée).`, `Key moments in this period: ${moments.join(", ")} (no made-up promotion).`) : "",
    L(`Formats : ${formats.join(", ")}.`, `Formats: ${formats.join(", ")}.`),
    todo ? L(`${todo} publication${todo > 1 ? "s" : ""} contien${todo > 1 ? "nent" : "t"} un « [À compléter : …] » à remplacer par un fait réel avant validation.`, `${todo} post${todo > 1 ? "s" : ""} contain${todo > 1 ? "" : "s"} a "[To complete: …]" to replace with a real fact before approval.`) : "",
  ].filter(Boolean).join(" ");
}

export function scheduleTime(params: PlanParams, day: number, slot: number): number {
  const [y, m, d] = params.startDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + day));
  const ymd = date.toISOString().slice(0, 10);
  const time = params.slots[slot % params.slots.length] ?? "10:00";
  return fromZonedTime(`${ymd}T${time}:00`, params.timezone).getTime();
}

export async function createContentPlan(ctx: JobContext, projectId: string, params: PlanParams) {
  const p = loadProject(projectId);
  const planId = ctx.payload.planId as string;
  ctx.progress(0.05, L("Stratégie éditoriale", "Editorial strategy"));
  const drafts = await ctx.step("drafts", async (): Promise<(PostDraft & { claims?: string[] })[]> => {
    if (llmConfigured()) {
      const base = (k: string) => ({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:${k}` });
      const r = await aiSocialPlan(base("plan"), p, { days: params.days, perDay: params.perDay, networks: params.networks.map((n) => n.network), goals: params.goals, tone: params.tone, mix: params.mix, link: params.link, schedule: scheduleLines(params), moments: momentsLine(p, params), recent: recentHooks(projectId, planId) });
      // Relecture « directeur de création social media » (grille notée, seuil 8/10) et une reprise ciblée des publications faibles.
      ctx.progress(0.12, L("Relecture du calendrier", "Reviewing the calendar"));
      const posts = r.posts.filter((d) => d.day < params.days && d.slot < params.perDay);
      const refined = await refinePlan(posts, p, { review: (xs) => aiSocialReview(base("review"), p, xs), repair: (items, global) => aiSocialRepair(base("repair"), p, items, global) });
      const rp = refined.report;
      run("UPDATE content_plans SET strategy = ? WHERE id = ?", `${r.strategy.trim()}\n\n${L(`Relecture du directeur de création : ${rp.review !== null ? `${rp.review.toFixed(1).replace(".", ",")}/10` : "indisponible"} ; grille du studio ${rp.scoreBefore.toFixed(1).replace(".", ",")} → ${rp.scoreAfter.toFixed(1).replace(".", ",")}/10${rp.kept ? ` (${rp.kept} publication${rp.kept > 1 ? "s" : ""} reprise${rp.kept > 1 ? "s" : ""})` : ""}.`, `Creative director review: ${rp.review !== null ? `${rp.review.toFixed(1)}/10` : "unavailable"}; studio checklist ${rp.scoreBefore.toFixed(1)} → ${rp.scoreAfter.toFixed(1)}/10${rp.kept ? ` (${rp.kept} post${rp.kept > 1 ? "s" : ""} reworked)` : ""}.`)}`, planId);
      return checkPostDrafts(refined.posts, p, (post, issues) => aiRewritePost({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:fix:${post.day}:${post.slot}` }, p, post, L(`Retire ces allégations non confirmées (ou remplace-les par « ${placeholder(contentLang())} ») : ${issues.join(" ; ")}. Garde l'angle et le ton.`, `Remove these unconfirmed claims (or replace them with "${placeholder(contentLang())}"): ${issues.join("; ")}. Keep the angle and tone.`)));
    }
    const local = localPlan(p, params);
    run("UPDATE content_plans SET strategy = ? WHERE id = ?", localStrategy(p, params, local), planId);
    return local;
  });

  // Création des publications (idempotent : une ligne par jour/créneau/réseau).
  const postIds: string[] = await ctx.step("rows", async () => {
    const ids: string[] = [];
    tx(() => {
      for (const d of drafts) {
        if (d.day >= params.days || d.slot >= params.perDay) continue;
        const net = params.networks.find((n) => n.network === d.network) ?? params.networks[0];
        const key = `${planId}:${d.day}:${d.slot}:${d.network}`;
        const existing = one<{ id: string }>("SELECT id FROM posts WHERE publish_key = ?", key);
        if (existing) {
          ids.push(existing.id);
          continue;
        }
        const pid = id();
        run(
          `INSERT INTO posts (id, project_id, plan_id, connection_id, network, format, status, scheduled_at, timezone, title, caption, hashtags, link, angle, media, brief, publish_key, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          pid,
          projectId,
          planId,
          net.connectionId ?? null,
          d.network,
          d.format,
          "generating",
          scheduleTime(params, d.day, d.slot),
          params.timezone,
          d.title,
          d.caption,
          d.hashtags.join(" "),
          params.link ?? null,
          d.angle,
          "[]",
          JSON.stringify(d.claims?.length ? { ...d.visual, claims: d.claims } : d.visual),
          key,
          now(),
          now(),
        );
        if (d.claims?.length) run("UPDATE posts SET error = ? WHERE id = ?", L(`À vérifier avant publication : ${d.claims.join(", ")}`, `Check before publishing: ${d.claims.join(", ")}`), pid);
        ids.push(pid);
      }
    });
    return ids;
  });

  // Médias de chaque publication.
  const cutouts = await ensureCutouts(ctx, p);
  const product = cutouts[0] ? await loadImage(assetData(cutouts[0])) : null;
  const logoAsset = latestAsset(projectId, "logo");
  const logo = logoAsset ? await loadImage(assetData(logoAsset)) : null;
  const videos = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'video' AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC", projectId);
  const services = isServices(p);
  const svcPhotos = services ? activityPhotos(projectId) : [];
  const pools: Record<string, Asset[]> = { packshot: assetsByRole(projectId, "packshot"), scene: assetsByRole(projectId, "scene"), detail: assetsByRole(projectId, "detail") };
  let needVideo = 0;
  for (const [i, postId] of postIds.entries()) {
    const post = one<any>("SELECT * FROM posts WHERE id = ?", postId);
    if (!post || post.status !== "generating") continue;
    ctx.progress(0.2 + (i / postIds.length) * 0.75, L(`Publication ${i + 1}/${postIds.length} : média ${NETWORK_FORMATS[post.network]?.label ?? post.network}`, `Post ${i + 1}/${postIds.length}: ${NETWORK_FORMATS[post.network]?.label ?? post.network} media`));
    const visual = json<PostDraft["visual"]>(post.brief, { kind: "creative", headline: "", subline: "", layout: "editorial" });
    const fmt = NETWORK_FORMATS[post.network] ?? NETWORK_FORMATS.instagram;
    let mediaIds: string[] = [];
    if (visual.kind === "video" || ["reel", "short", "video"].includes(post.format)) {
      const v = videos.find((x) => json<any>(x.meta, {}).format === fmt.video) ?? videos[0];
      if (v) mediaIds = [v.id];
      else needVideo++;
    } else if ((visual.kind === "packshot" || visual.kind === "scene" || visual.kind === "detail") && pools[visual.kind]?.length) {
      const pool = pools[visual.kind];
      mediaIds = [pool[i % pool.length].id];
    } else if (services) {
      // Entreprise de services (pas de produit détouré) : visuel à la marque par publication, sur une photo réelle de
      // l'activité quand il y en a (à tour de rôle), sinon fond graphique ; titre de la publication et appel à l'action.
      const imgFmt: FormatId = post.format === "story" ? "story" : fmt.image;
      const slides = post.format === "carousel" && visual.slides?.length ? visual.slides.slice(0, 6) : [visual.headline || activityName(p)];
      // Avec l'IA d'images : une image propre à cette publication (jamais la même d'une publication à l'autre) ;
      // sinon, photos existantes à tour de rôle.
      const aspect = imgFmt === "story" ? "9:16" : FORMATS[imgFmt].w === FORMATS[imgFmt].h ? "1:1" : FORMATS[imgFmt].w > FORMATS[imgFmt].h ? "16:9" : "4:5";
      const own = await ctx.step(`post-photo:${postId}`, async () => (await postAmbiance({ userId: p.userId, projectId, jobId: ctx.job.id }, p, { key: postId, topic: [visual.headline, visual.subline, post.caption].filter(Boolean).join(" — "), aspect, name: `${C("photo-publication", "post-photo")}-${post.network}-${i + 1}.jpg` }))?.id ?? null);
      const ownAsset = own ? getAsset(own) ?? null : null;
      for (const [j, text] of slides.entries()) {
        const photoAsset = ownAsset ?? (svcPhotos.length ? svcPhotos[(i + j) % svcPhotos.length] : null);
        const photo = photoAsset ? await loadImage(assetData(photoAsset)).catch(() => null) : null;
        const jpg = await renderServiceCard({ palette: palette(p), typo: brandTypo(p), format: FORMATS[imgFmt], brand: p.brand?.name ?? p.name, eyebrow: placeLine(p) && !(visual.subline ?? "").includes(placeLine(p)) ? placeLine(p) : undefined, title: text, text: j === 0 ? visual.subline || undefined : undefined, cta: j === slides.length - 1 ? serviceCta(p, true) : undefined, photo });
        const a = await saveAsset({ projectId, userId: p.userId, data: jpg, name: `${C("publication", "post")}-${post.network}-${new Date(post.scheduled_at).toISOString().slice(0, 10)}-${i + 1}${slides.length > 1 ? `-${j + 1}` : ""}.jpg`, mime: "image/jpeg", role: "social", folderKey: "content.calendar", origin: "generated", sourceAssetId: photoAsset?.id, meta: { recipe: photoAsset ? L(`Photo de votre activité mise en page pour ${fmt.label}`, `Your business photo laid out for ${fmt.label}`) : L(`Visuel à la marque pour ${fmt.label} (aucune photo fournie)`, `Branded visual for ${fmt.label} (no photo provided)`), post: postId, business: "services" } });
        mediaIds.push(a.id);
      }
    } else if (product) {
      // Story en 9:16 ; carrousel : une diapositive par texte (couverture, idées, action), même typographie et palette.
      const imgFmt: FormatId = post.format === "story" ? "story" : fmt.image;
      const slides = post.format === "carousel" && visual.slides?.length ? visual.slides.slice(0, 6) : [visual.headline || p.product.name];
      const layouts = ["bold", "minimal", "editorial", "centered", "split"] as const;
      for (const [j, text] of slides.entries()) {
        const layout = slides.length > 1 ? (j === 0 ? visual.layout : layouts[j % layouts.length]) : visual.layout;
        const r = await renderCreative({ product, palette: palette(p), typo: brandTypo(p), format: FORMATS[imgFmt], layout, headline: text, subline: j === 0 ? visual.subline || undefined : undefined, brand: p.brand?.name ?? p.name, logo, seed: i + 11 + j * 7 });
        const a = await saveAsset({ projectId, userId: p.userId, data: r.jpg, name: `${C("publication", "post")}-${post.network}-${new Date(post.scheduled_at).toISOString().slice(0, 10)}-${i + 1}${slides.length > 1 ? `-${j + 1}` : ""}.jpg`, mime: "image/jpeg", role: "social", folderKey: "content.calendar", origin: "generated", meta: { recipe: slides.length > 1 ? L(`Diapositive ${j + 1}/${slides.length} du carrousel ${fmt.label}`, `Carousel slide ${j + 1}/${slides.length} for ${fmt.label}`) : L(`Visuel ${FORMATS[imgFmt].label} pour ${fmt.label}`, `${FORMATS[imgFmt].label} visual for ${fmt.label}`), post: postId, safeArea: r.safe, minFontPx: r.minFontPx } });
        mediaIds.push(a.id);
      }
    }
    for (const m of mediaIds) addUsage(m, "post", postId, `${fmt.label} — ${new Date(post.scheduled_at).toLocaleDateString(intlLocale(uiLang()))}`);
    // Une publication signalée par le contrôle des allégations n'est jamais programmée automatiquement.
    const flagged = !!json<{ claims?: string[] }>(post.brief, {}).claims?.length;
    const status = !mediaIds.length && post.network !== "facebook" ? "draft" : flagged ? "review" : decideStatus(p, post.network, post.connection_id, params.approval, mediaIds);
    run("UPDATE posts SET media = ?, status = ?, auto_approved = ?, approved_at = CASE WHEN ? = 'scheduled' THEN ? ELSE approved_at END, updated_at = ? WHERE id = ?", JSON.stringify(mediaIds), status, status === "scheduled" ? 1 : 0, status, now(), now(), postId);
  }
  if (needVideo) {
    // Une vidéo verticale est produite une seule fois puis réutilisée.
    enqueue({ userId: p.userId, projectId, type: "video.render", label: L("Vidéo 9:16 pour le calendrier", "9:16 video for the calendar"), payload: { format: "9:16", target: "social", attachPlan: planId }, idempotencyKey: `plan-video:${planId}` });
  }
  run("UPDATE content_plans SET status = 'ready' WHERE id = ?", planId);
  notify(p.userId, projectId, L("Calendrier prêt", "Calendar ready"), L(`${postIds.length} publications préparées${needVideo ? ` ; ${needVideo} attendent la vidéo en cours de rendu` : ""}.`, `${postIds.length} posts prepared${needVideo ? `; ${needVideo} waiting for the video being rendered` : ""}.`));
  return { posts: postIds.length, waitingVideo: needVideo };
}

/** Statut après génération : validation manuelle ou programmation automatique selon les règles. */
export function decideStatus(p: Project, network: string, connectionId: string | null, approval: "manual" | "auto", media: string[]): string {
  const rules = p.settings.autopublish;
  const auto = approval === "auto" && autopublishAllowed(p.userId) && rules.enabled && rules.networks.includes(network) && !!connectionId;
  if (!auto) return "review";
  const kind = media.length ? (one<{ kind: string }>("SELECT kind FROM assets WHERE id = ?", media[0])?.kind ?? "image") : "text";
  if (rules.requireApprovalFor.includes(kind)) return "review";
  return "scheduled";
}

/** Rattache une vidéo produite aux publications en attente d'un plan. */
export function attachVideoToPlan(planId: string, videoId: string) {
  const posts = all<{ id: string; network: string; connection_id: string | null; project_id: string }>("SELECT id, network, connection_id, project_id FROM posts WHERE plan_id = ? AND status = 'draft' AND media = '[]' AND format IN ('reel','short','video','story')", planId);
  for (const post of posts) {
    run("UPDATE posts SET media = ?, status = 'review', updated_at = ? WHERE id = ?", JSON.stringify([videoId]), now(), post.id);
    addUsage(videoId, "post", post.id, L("Publication vidéo", "Video post"));
  }
}

/** Planificateur : met en file les publications arrivées à échéance (exécuté par le worker). */
export function enqueueDuePosts() {
  const due = all<{ id: string; project_id: string; scheduled_at: number; user_id: string }>(
    "SELECT p.id, p.project_id, p.scheduled_at, pr.user_id FROM posts p JOIN projects pr ON pr.id = p.project_id WHERE p.status = 'scheduled' AND p.scheduled_at <= ? LIMIT 50",
    now(),
  );
  for (const d of due) {
    enqueue({ userId: d.user_id, projectId: d.project_id, type: "post.publish", label: L("Publication programmée", "Scheduled post"), payload: { postId: d.id }, idempotencyKey: `publish:${d.id}:${d.scheduled_at}`, maxAttempts: 4 });
  }
  return due.length;
}

/**
 * Titre demandé pour un nouveau visuel : seulement un texte entre guillemets (« Rose ou bleu ? »). Une consigne
 * (« plus court », « plus pédagogique ») n'est jamais imprimée telle quelle sur l'image.
 */
export function quotedHeadline(instruction?: string | null): string {
  const m = (instruction ?? "").match(/[«"“]\s*([^»"”]{2,40}?)\s*[»"”]/);
  return m ? m[1].trim() : "";
}
