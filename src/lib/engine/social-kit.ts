/**
 * Kit réseaux sociaux de la marque (approche community manager) : ligne éditoriale contrôlée (piliers, ce qu'on
 * dit / ne dit pas, emojis, légendes d'exemple sans allégation) et visuels aux couleurs de la piste de logo
 * retenue (profil, stories à la une, modèles de publication, bannières), exportables en PNG et en ZIP.
 */
import { stableKey } from "../ai/keys";
import { currentTrace, shortHash } from "../ai/trace";
import { zipSync, strToU8 } from "fflate";
import { all, json } from "../db";
import { saveAsset, assetData, type Asset } from "../library";
import { loadProject, saveBrand, type Project } from "../projects";
import type { SocialVoice } from "../project-types";
import { renderSocialKit, socialKitSheet, highlightThemes, HIGHLIGHT_LABEL } from "../media/social-kit";
import type { CreativeRoute } from "../media/brand-mockups";
import { placeholder } from "../ai/prompts";
import { aiSocialVoice, lintClaims, lintHollow, scrubClaims } from "../ai/tasks";
import { GENERIC_PILLAR, voiceIssues } from "./social-quality";
import { llmConfigured } from "../ai/llm";
import { validCutouts } from "./cutouts";
import { C, L, contentLang } from "../i18n-server";

/** De vrais avis existent-ils ? (fait confirmé fourni par le client ou sa source : note, avis, témoignages) */
export function hasRealReviews(p: Pick<Project, "product">): boolean {
  return p.product.facts.some((f) => f.status === "confirmed" && f.source !== "ai" && /avis|review|t[ée]moignage|testimonial|note moyenne|rating|[ée]toiles/i.test(`${f.key} ${f.label}`) && !!f.value.trim());
}

const ph = (what: string, en: string) => C(`${placeholder("fr", what)}`, `${placeholder("en", en)}`);

/** Ligne éditoriale du studio, sans IA, tirée de la marque et de la stratégie (aucune promesse ajoutée). */
export function localSocialVoice(p: Project): SocialVoice {
  const b = p.brand!;
  const product = p.product.name || C("le produit", "the product");
  // Piliers de la stratégie repris seulement s'ils sont propres à la marque (pas « Produit », « Usage »…).
  const fromStrategy = (p.strategy?.pillars ?? []).filter((x) => x.trim() && !GENERIC_PILLAR.test(x.trim()) && !/^(usage|in use|coulisses|behind the scenes)$/i.test(x.trim())).slice(0, 3);
  const defaults: [string, string][] = p.business === "services"
    ? [[C("Le métier en action", "The craft in action"), C("Montrer de vraies réalisations et la façon de travailler.", "Show real work and how it's done.")], [C("Conseils d'expert", "Expert tips"), C("Répondre aux questions que posent les clients.", "Answer the questions clients ask.")], [C("Coulisses et équipe", "Behind the scenes and team"), C("Présenter les personnes et le lieu, avec leur accord.", "Introduce the people and the place, with their consent.")]]
    : [[C("Le produit en vrai", "The product, for real"), C(`Montrer ${product} de près : gestes, détails, usages réels.`, `Show ${product} up close: handling, details, real uses.`)], [C("Questions et conseils", "Questions and tips"), C("Répondre aux questions avant achat, avec des réponses vérifiées.", "Answer pre-purchase questions with verified answers.")], [C("Les coulisses", "Behind the scenes"), C("Préparation des commandes, choix des matières, la marque au quotidien.", "Order prep, material choices, the brand day to day.")]];
  const pillars = fromStrategy.length >= 3 ? fromStrategy.map((t, i) => ({ title: t, idea: defaults[i]?.[1] ?? "" })) : defaults.map(([title, idea]) => ({ title, idea }));
  const calm = ["atelier", "galerie", "joaillerie", "clinique"].includes(b.direction);
  const playful = ["pop", "gourmand"].includes(b.direction) || ["enfants", "animaux", "alimentation"].includes(p.product.sector ?? "");
  const emoji: SocialVoice["emoji"] = calm ? "none" : "sparing";
  // Légendes d'exemple : accroche concrète, une phrase de corps, un appel à l'interaction précis ; un seul espace
  // réservé au plus, et seulement quand aucun fait confirmé ne peut servir.
  const fact = p.product.facts.find((f) => f.status === "confirmed" && f.value.trim() && f.value.length <= 60 && !textIssues(p, `${f.label} ${f.value}`).length);
  const qa = p.product.questions.find((q) => q.answer?.trim() && q.answer.length <= 160 && !textIssues(p, `${q.question} ${q.answer}`).length);
  const variant = p.business === "services" ? undefined : p.product.variants.find((v) => v.values.length >= 2);
  const services = p.business === "services";
  const first = services
    ? C(`Ce que l'on ne voit pas en arrivant : ${ph("un geste précis de votre métier", "a precise step of your craft")}.\nUne question sur la façon dont on travaille ? Posez-la en commentaire.`, `What you don't see when you walk in: ${ph("un geste précis de votre métier", "a precise step of your craft")}.\nCurious about how we work? Ask in the comments.`)
    : variant
      ? C(`${variant.values[0]} ou ${variant.values[1]} : vous choisiriez lequel ?\n${product}, avec les mêmes détails dans chaque version.\nRépondez en commentaire.`, `${variant.values[0]} or ${variant.values[1]}: which one would you pick?\n${product}, same details in every version.\nTell us in the comments.`)
      : fact
        ? C(`${fact.label} : ${fact.value.replace(/[.!]+$/, "")}. Le détail qui se voit de près.\n${product}, sans filtre.\nEnregistrez la publication pour la retrouver.`, `${fact.label}: ${fact.value.replace(/[.!]+$/, "")}. The detail you notice up close.\n${product}, unfiltered.\nSave this post for later.`)
        : C(`Le détail qu'on ne remarque pas tout de suite : ${ph("le détail que montre la photo", "the detail the photo shows")}.\nEnregistrez la publication pour la retrouver.`, `The detail you don't notice at first: ${ph("le détail que montre la photo", "the detail the photo shows")}.\nSave this post for later.`);
  const second = qa
    ? C(`« ${qa.question.replace(/\s*\?*$/, "")} ? »\nNotre réponse : ${qa.answer!.trim()}\nUne autre question ? Posez-la en commentaire.`, `"${qa.question.replace(/\s*\?*$/, "")}?"\nOur answer: ${qa.answer!.trim()}\nGot another question? Ask it in the comments.`)
    : C(`Une question qu'on nous pose : ${ph("une vraie question de client et sa réponse vérifiée", "a real customer question and its verified answer")}\nVous en avez une autre ? Posez-la en commentaire.`, `A question we get: ${ph("une vraie question de client et sa réponse vérifiée", "a real customer question and its verified answer")}\nGot another one? Ask it in the comments.`);
  const third = C(`Avant que ${services ? "vous arriviez" : "le colis parte"} : ${ph("la photo des coulisses", "the behind-the-scenes photo")}.\nQuelle étape voulez-vous voir la prochaine fois ? Dites-le-nous.`, `Before ${services ? "you arrive" : "your order leaves"}: ${ph("la photo des coulisses", "the behind-the-scenes photo")}.\nWhich step should we show next? Tell us.`);
  const series: NonNullable<SocialVoice["series"]> = services
    ? [{ name: C("Le conseil du mardi", "Tuesday tip"), idea: C("Un conseil concret du métier, une seule idée.", "One practical tip from the trade, one idea."), weekday: 2 }, { name: C("Comment ça se passe", "How it works"), idea: C("Une étape d'un rendez-vous ou d'une intervention, montrée telle qu'elle est.", "One step of an appointment or job, shown as it is."), weekday: 4 }, { name: C("L'équipe", "Meet the team"), idea: C("Une personne, son rôle, avec son accord.", "One person and their role, with their consent."), weekday: 5 }]
    : [{ name: C("Vu de près", "Up close"), idea: C(`Un détail de ${product} en gros plan, expliqué en une phrase.`, `One detail of ${product} up close, explained in one sentence.`), weekday: 2 }, { name: C("Vos questions", "You asked"), idea: C("Une vraie question de client, une réponse vérifiée.", "A real customer question, a verified answer."), weekday: 4 }, { name: C("En coulisses", "Behind the scenes"), idea: C("Préparation, choix, emballage : la marque au quotidien.", "Prep, choices, packing: the brand day to day."), weekday: 6 }];
  return {
    pillars,
    say: b.tone.do.length ? b.tone.do.slice(0, 4) : [C("Des phrases courtes et concrètes", "Short, concrete sentences"), C("Ce que l'on voit sur la photo, sans enjoliver", "What the photo shows, without embellishing")],
    dontSay: [...new Set([...b.tone.dont.slice(0, 3), C("Aucune promesse de résultat, de sécurité ou de santé non prouvée", "No unproven promise of results, safety or health"), C("Aucun avis, chiffre ou prix inventé", "No made-up reviews, figures or prices")])].slice(0, 5),
    emoji,
    emojis: emoji === "none" ? [] : playful ? ["✨", "🌙", "👉"] : ["👉", "✨"],
    captions: [
      { pillar: pillars[0].title, text: first },
      { pillar: pillars[1].title, text: second },
      { pillar: pillars[2].title, text: third },
    ],
    series,
    generatedBy: "local",
  };
}

/** Coupe un texte sur un mot (fin de phrase si possible), sans ponctuation pendante. */
const clipWords = (t: string, max: number) => {
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > max * 0.6 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "").replace(/[\s,;:–—-]+$/, "");
};

/** Problèmes d'un texte du kit : allégation non confirmée ou formule creuse. */
const textIssues = (p: Project, t: string) => [...lintClaims({ t }, p).map((c) => c.term), ...lintHollow({ t }).map((h) => h.term)];

/**
 * Ligne éditoriale de l'IA contrôlée : légendes et piliers avec allégation ou formule creuse remplacés par ceux du
 * studio, emojis retirés quand la ligne dit « aucun », listes vides complétées. Rend aussi ce qui a été corrigé.
 */
export function checkSocialVoice(v: Omit<SocialVoice, "generatedBy">, p: Project): { voice: SocialVoice; fixed: string[] } {
  const local = localSocialVoice(p);
  const fixed: string[] = [];
  const pillars = [0, 1, 2].map((i) => {
    const x = v.pillars[i];
    if (!x?.title?.trim()) return local.pillars[i];
    // Texte de l'IA gardé : titre trop long raccourci, allégation retirée par le code (pas de remplacement payé perdu).
    const title = clipWords(x.title, 60);
    const claims = lintClaims({ t: `${title}. ${x.idea}` }, p).map((c) => c.term);
    if (lintHollow({ t: title }).length) {
      fixed.push(`pilier ${i + 1} : formule creuse`);
      return local.pillars[i];
    }
    if (claims.length) fixed.push(`pilier ${i + 1} : ${claims.join(", ")} retiré`);
    return claims.length ? { ...x, title: scrubClaims({ t: title }, p).content.t, idea: scrubClaims({ t: x.idea }, p).content.t } : { ...x, title };
  });
  const stripEmoji = (s: string) => s.replace(/\p{Extended_Pictographic}️?/gu, "").replace(/ {2,}/g, " ").trim();
  const captions = [0, 1, 2].map((i) => {
    const x = v.captions[i];
    if (!x?.text?.trim()) return local.captions[i];
    let text = x.text.length > 600 ? clipWords(x.text, 600) : x.text;
    const claims = lintClaims({ t: text }, p).map((c) => c.term);
    if (claims.length) {
      fixed.push(`légende ${i + 1} : ${claims.join(", ")} retiré`);
      text = scrubClaims({ t: text }, p).content.t;
    }
    return { pillar: pillars[i].title, text: v.emoji === "none" ? stripEmoji(text) : text };
  });
  const clean = (xs: string[], fb: string[]) => {
    const ok = xs.map((s) => s.trim()).filter((s) => s && s.length <= 160);
    return ok.length >= 2 ? ok.slice(0, 5) : fb;
  };
  // Séries récurrentes : nom court, sans allégation ; sinon celles du studio.
  const series = (v.series ?? []).filter((x) => x.name?.trim() && x.name.length <= 40 && !textIssues(p, `${x.name}. ${x.idea}`).length).slice(0, 3);
  return {
    voice: { pillars, say: clean(v.say, local.say), dontSay: clean(v.dontSay, local.dontSay), emoji: v.emoji, emojis: v.emoji === "none" ? [] : v.emojis.filter((e) => /\p{Extended_Pictographic}/u.test(e)).slice(0, 6), captions, series: series.length >= 2 ? series : local.series, generatedBy: "ai" },
    fixed,
  };
}

/** Ligne éditoriale du projet : celle déjà enregistrée, sinon IA contrôlée (si disponible), sinon celle du studio. */
export async function ensureSocialVoice(projectId: string, opts: { force?: boolean; requestId?: string; ai?: ((p: Project, feedback?: string) => Promise<Omit<SocialVoice, "generatedBy">>) | null } = {}): Promise<SocialVoice | null> {
  const p = loadProject(projectId);
  if (!p.brand) return null;
  if (p.brand.social && !opts.force) return p.brand.social;
  let voice = localSocialVoice(p);
  // Clé d'usage stable : la tâche en cours (reprise sans double débit), sinon la demande du client, sinon l'empreinte
  // de ce qui définit la ligne éditoriale (même marque, même piste = même travail).
  const scope = currentTrace().jobId ?? opts.requestId ?? shortHash(JSON.stringify([p.brand.name, p.brand.tone, p.brand.logo.proposal, p.brand.palette]));
  const ai = opts.ai !== undefined ? opts.ai : llmConfigured() ? (pp: Project, feedback?: string) => aiSocialVoice({ userId: pp.userId, projectId: pp.id, usageKey: stableKey("social-voice", pp.id, scope, feedback ? "fix" : "first") }, pp, feedback) : null;
  if (ai) {
    try {
      const r = checkSocialVoice(await ai(p), p);
      voice = r.voice;
      if (r.fixed.length) console.info(`[kit social] ${projectId} : textes remplacés (${r.fixed.join(" | ")})`);
      // Relecture « directeur de création » : grille mesurable ; une seule reprise ciblée, la meilleure version est gardée.
      const issues = [...r.fixed.map((f) => `${f} (allégation ou formule creuse)`), ...voiceIssues(voice, p)];
      if (issues.length) {
        try {
          const again = checkSocialVoice(await ai(p, issues.join(" ; ")), p);
          const left = again.fixed.length + voiceIssues(again.voice, p).length;
          if (left < issues.length) voice = again.voice;
        } catch (e) {
          console.info(`[kit social] ${projectId} : reprise de la ligne éditoriale indisponible (${(e as Error).message})`);
        }
      }
    } catch (e) {
      console.info(`[kit social] ${projectId} : ligne éditoriale IA indisponible (${(e as Error).message}), version du studio`);
    }
  }
  saveBrand(projectId, { ...loadProject(projectId).brand!, social: voice });
  return voice;
}

/** Piste retenue (complète, avec son symbole) d'après la dernière proposition enregistrée. */
export function chosenRoute(projectId: string): CreativeRoute | null {
  const p = loadProject(projectId);
  const key = p.brand?.logo.proposal;
  const pid = p.brand?.logo.proposalId;
  if (pid) {
    const r = all<Asset>("SELECT * FROM assets WHERE id = ? AND project_id = ?", pid, projectId)[0];
    const info = r ? json<any>(r.meta as any, {}) : null;
    if (info?.route) return info.route as CreativeRoute;
  }
  const rows = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo-proposal' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 12", projectId);
  for (const r of rows) {
    const info = json<any>(r.meta as any, {});
    if (info.route && info.key === key) return info.route as CreativeRoute;
  }
  return null;
}

/** Ton éditorial en texte (fichier du ZIP et charte). */
export function voiceMarkdown(name: string, v: SocialVoice): string {
  const emoji = { none: C("aucun emoji", "no emoji"), sparing: C("un emoji au plus par légende, jamais à la place d'un mot", "one emoji at most per caption, never instead of a word"), free: C("emojis libres, avec goût", "emojis welcome, with taste") }[v.emoji];
  return C(
    `# Réseaux sociaux — ${name}\n\n## Piliers de contenu\n${v.pillars.map((x, i) => `${i + 1}. **${x.title}** — ${x.idea}`).join("\n")}\n\n## Ce qu'on dit\n${v.say.map((s) => `- ${s}`).join("\n")}\n\n## Ce qu'on ne dit pas\n${v.dontSay.map((s) => `- ${s}`).join("\n")}\n\n${v.series?.length ? `## Séries récurrentes\n${v.series.map((x) => `- **${x.name}**${x.weekday !== undefined ? ` (${["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][x.weekday]})` : ""} — ${x.idea}`).join("\n")}\n\n` : ""}## Emojis\n${emoji}${v.emojis.length ? ` : ${v.emojis.join(" ")}` : ""}\n\n## Exemples de légendes\n${v.captions.map((c) => `**${c.pillar}**\n\n${c.text}`).join("\n\n")}\n\n_Les « [À compléter : …] » sont à remplacer par des faits réels avant publication._\n`,
    `# Social media — ${name}\n\n## Content pillars\n${v.pillars.map((x, i) => `${i + 1}. **${x.title}** — ${x.idea}`).join("\n")}\n\n## What we say\n${v.say.map((s) => `- ${s}`).join("\n")}\n\n## What we don't say\n${v.dontSay.map((s) => `- ${s}`).join("\n")}\n\n${v.series?.length ? `## Recurring series\n${v.series.map((x) => `- **${x.name}**${x.weekday !== undefined ? ` (${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][x.weekday]})` : ""} — ${x.idea}`).join("\n")}\n\n` : ""}## Emojis\n${emoji}${v.emojis.length ? `: ${v.emojis.join(" ")}` : ""}\n\n## Sample captions\n${v.captions.map((c) => `**${c.pillar}**\n\n${c.text}`).join("\n\n")}\n\n_Replace every "[To complete: …]" with real facts before posting._\n`,
  );
}

/** Rend et enregistre le kit (PNG, planche d'ensemble, ZIP). Sans piste retenue (logo fourni, ancien logo) : rien. */
export async function saveSocialKit(projectId: string, opts: { route?: CreativeRoute | null; voiceAi?: ((p: Project, feedback?: string) => Promise<Omit<SocialVoice, "generatedBy">>) | null } = {}) {
  const route = opts.route ?? chosenRoute(projectId);
  if (!route) return null;
  const voice = await ensureSocialVoice(projectId, { ai: opts.voiceAi });
  const p = loadProject(projectId);
  const b = p.brand!;
  const best = p.business === "services" ? undefined : validCutouts(p.id)[0];
  const reviews = hasRealReviews(p);
  const value = b.values.find((v) => v.text.trim() && !textIssues(p, v.text).length);
  const images = await renderSocialKit({ route, brand: { name: b.name, tagline: b.tagline }, product: best ? assetData(best) : null, productName: p.business === "services" ? undefined : p.product.name, hasReviews: reviews, quote: value?.text });
  const sheet = await socialKitSheet(images, route, reviews);
  const batch = Date.now().toString(36);
  const common = { projectId, userId: p.userId, folderKey: "images.social", origin: "generated" as const };
  const slug = b.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "marque";
  const files: Record<string, Uint8Array> = {};
  for (const img of images) {
    const name = `${slug}-${img.item}.png`;
    files[name] = img.png;
    await saveAsset({ ...common, data: img.png, name, mime: "image/png", role: "social-kit", meta: { item: img.item, label: img.label, batch, route: route.key } });
  }
  const sheetAsset = await saveAsset({ ...common, data: sheet, name: `${slug}-${C("kit-reseaux", "social-kit")}.png`, mime: "image/png", role: "social-kit-sheet", meta: { batch, route: route.key } });
  if (voice) files[`${slug}-${C("ton-editorial", "editorial-tone")}.md`] = strToU8(voiceMarkdown(b.name, voice));
  const zip = Buffer.from(zipSync(files, { level: 6 }));
  const zipAsset = await saveAsset({ ...common, data: zip, name: `${slug}-${C("kit-reseaux-sociaux", "social-media-kit")}.zip`, mime: "application/zip", kind: "archive", role: "social-kit-zip", meta: { batch, files: Object.keys(files) } });
  return { images: images.length, sheet: sheetAsset, zip: zipAsset, voice, highlights: highlightThemes(reviews).map((t) => (contentLang() === "en" ? HIGHLIGHT_LABEL[t][1] : HIGHLIGHT_LABEL[t][0])) };
}

/** Dernier kit enregistré (images d'un même lot). */
export function latestSocialKit(projectId: string) {
  const sheet = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'social-kit-sheet' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId)[0];
  if (!sheet) return null;
  const batch = json<any>(sheet.meta as any, {}).batch;
  const items = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'social-kit' AND deleted_at IS NULL AND json_extract(meta, '$.batch') = ? ORDER BY created_at", projectId, batch);
  const zip = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'social-kit-zip' AND deleted_at IS NULL AND json_extract(meta, '$.batch') = ? LIMIT 1", projectId, batch)[0];
  return { sheet, items, zip, label: L("Kit réseaux sociaux", "Social media kit") };
}
