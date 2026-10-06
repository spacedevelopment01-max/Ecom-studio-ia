/**
 * Kit réseaux sociaux de la marque (approche community manager) : ligne éditoriale contrôlée (piliers, ce qu'on
 * dit / ne dit pas, emojis, légendes d'exemple sans allégation) et visuels aux couleurs de la piste de logo
 * retenue (profil, stories à la une, modèles de publication, bannières), exportables en PNG et en ZIP.
 */
import { zipSync, strToU8 } from "fflate";
import { all, json } from "../db";
import { saveAsset, assetData, type Asset } from "../library";
import { loadProject, saveBrand, type Project } from "../projects";
import type { SocialVoice } from "../project-types";
import { renderSocialKit, socialKitSheet, highlightThemes, HIGHLIGHT_LABEL } from "../media/social-kit";
import type { CreativeRoute } from "../media/brand-mockups";
import { placeholder } from "../ai/prompts";
import { aiSocialVoice, lintClaims, lintHollow } from "../ai/tasks";
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
  const fromStrategy = (p.strategy?.pillars ?? []).filter((x) => x.trim()).slice(0, 3);
  const defaults: [string, string][] = p.business === "services"
    ? [[C("Le métier en action", "The craft in action"), C("Montrer de vraies réalisations et la façon de travailler.", "Show real work and how it's done.")], [C("Conseils d'expert", "Expert tips"), C("Répondre aux questions que posent les clients.", "Answer the questions clients ask.")], [C("Coulisses et équipe", "Behind the scenes and team"), C("Présenter les personnes et le lieu, avec leur accord.", "Introduce the people and the place, with their consent.")]]
    : [[C("Le produit en vrai", "The product, for real"), C(`Montrer ${product} de près : gestes, détails, usages réels.`, `Show ${product} up close: handling, details, real uses.`)], [C("Questions et conseils", "Questions and tips"), C("Répondre aux questions avant achat, avec des réponses vérifiées.", "Answer pre-purchase questions with verified answers.")], [C("Les coulisses", "Behind the scenes"), C("Préparation des commandes, choix des matières, la marque au quotidien.", "Order prep, material choices, the brand day to day.")]];
  const pillars = fromStrategy.length >= 3 ? fromStrategy.map((t, i) => ({ title: t, idea: defaults[i]?.[1] ?? "" })) : defaults.map(([title, idea]) => ({ title, idea }));
  const calm = ["atelier", "galerie", "joaillerie", "clinique"].includes(b.direction);
  const playful = ["pop", "gourmand"].includes(b.direction) || ["enfants", "animaux", "alimentation"].includes(p.product.sector ?? "");
  const emoji: SocialVoice["emoji"] = calm ? "none" : "sparing";
  return {
    pillars,
    say: b.tone.do.length ? b.tone.do.slice(0, 4) : [C("Des phrases courtes et concrètes", "Short, concrete sentences"), C("Ce que l'on voit sur la photo, sans enjoliver", "What the photo shows, without embellishing")],
    dontSay: [...new Set([...b.tone.dont.slice(0, 3), C("Aucune promesse de résultat, de sécurité ou de santé non prouvée", "No unproven promise of results, safety or health"), C("Aucun avis, chiffre ou prix inventé", "No made-up reviews, figures or prices")])].slice(0, 5),
    emoji,
    emojis: emoji === "none" ? [] : playful ? ["✨", "🌙", "👉"] : ["👉", "✨"],
    captions: [
      { pillar: pillars[0].title, text: C(`${product}, vu de près. ${ph("le détail que montre la photo", "the detail the photo shows")}\nTout est en lien dans la bio.`, `${product}, up close. ${ph("le détail que montre la photo", "the detail the photo shows")}\nEverything's at the link in bio.`) },
      { pillar: pillars[1].title, text: C(`Vous nous demandez souvent : ${ph("une vraie question de client", "a real customer question")}\nNotre réponse : ${ph("réponse vérifiée", "verified answer")}`, `You often ask us: ${ph("une vraie question de client", "a real customer question")}\nOur answer: ${ph("réponse vérifiée", "verified answer")}`) },
      { pillar: pillars[2].title, text: C(`Dans les coulisses de ${b.name} : ${ph("ce que montre la photo", "what the photo shows")}.`, `Behind the scenes at ${b.name}: ${ph("ce que montre la photo", "what the photo shows")}.`) },
    ],
    generatedBy: "local",
  };
}

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
    if (!x?.title?.trim() || x.title.length > 60) return local.pillars[i];
    const bad = textIssues(p, `${x.title}. ${x.idea}`);
    if (bad.length) {
      fixed.push(`pilier ${i + 1} : ${bad.join(", ")}`);
      return local.pillars[i];
    }
    return x;
  });
  const stripEmoji = (s: string) => s.replace(/\p{Extended_Pictographic}️?/gu, "").replace(/ {2,}/g, " ").trim();
  const captions = [0, 1, 2].map((i) => {
    const x = v.captions[i];
    if (!x?.text?.trim() || x.text.length > 600) return local.captions[i];
    const bad = textIssues(p, x.text);
    if (bad.length) {
      fixed.push(`légende ${i + 1} : ${bad.join(", ")}`);
      return local.captions[i];
    }
    return { pillar: pillars[i].title, text: v.emoji === "none" ? stripEmoji(x.text) : x.text };
  });
  const clean = (xs: string[], fb: string[]) => {
    const ok = xs.map((s) => s.trim()).filter((s) => s && s.length <= 160);
    return ok.length >= 2 ? ok.slice(0, 5) : fb;
  };
  return {
    voice: { pillars, say: clean(v.say, local.say), dontSay: clean(v.dontSay, local.dontSay), emoji: v.emoji, emojis: v.emoji === "none" ? [] : v.emojis.filter((e) => /\p{Extended_Pictographic}/u.test(e)).slice(0, 6), captions, generatedBy: "ai" },
    fixed,
  };
}

/** Ligne éditoriale du projet : celle déjà enregistrée, sinon IA contrôlée (si disponible), sinon celle du studio. */
export async function ensureSocialVoice(projectId: string, opts: { force?: boolean; ai?: ((p: Project) => Promise<Omit<SocialVoice, "generatedBy">>) | null } = {}): Promise<SocialVoice | null> {
  const p = loadProject(projectId);
  if (!p.brand) return null;
  if (p.brand.social && !opts.force) return p.brand.social;
  let voice = localSocialVoice(p);
  const ai = opts.ai !== undefined ? opts.ai : llmConfigured() ? (pp: Project) => aiSocialVoice({ userId: pp.userId, projectId: pp.id, usageKey: `social-voice:${pp.id}:${Date.now().toString(36)}` }, pp) : null;
  if (ai) {
    try {
      const r = checkSocialVoice(await ai(p), p);
      voice = r.voice;
      if (r.fixed.length) console.info(`[kit social] ${projectId} : textes remplacés (${r.fixed.join(" | ")})`);
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
    `# Réseaux sociaux — ${name}\n\n## Piliers de contenu\n${v.pillars.map((x, i) => `${i + 1}. **${x.title}** — ${x.idea}`).join("\n")}\n\n## Ce qu'on dit\n${v.say.map((s) => `- ${s}`).join("\n")}\n\n## Ce qu'on ne dit pas\n${v.dontSay.map((s) => `- ${s}`).join("\n")}\n\n## Emojis\n${emoji}${v.emojis.length ? ` : ${v.emojis.join(" ")}` : ""}\n\n## Exemples de légendes\n${v.captions.map((c) => `**${c.pillar}**\n\n${c.text}`).join("\n\n")}\n\n_Les « [À compléter : …] » sont à remplacer par des faits réels avant publication._\n`,
    `# Social media — ${name}\n\n## Content pillars\n${v.pillars.map((x, i) => `${i + 1}. **${x.title}** — ${x.idea}`).join("\n")}\n\n## What we say\n${v.say.map((s) => `- ${s}`).join("\n")}\n\n## What we don't say\n${v.dontSay.map((s) => `- ${s}`).join("\n")}\n\n## Emojis\n${emoji}${v.emojis.length ? `: ${v.emojis.join(" ")}` : ""}\n\n## Sample captions\n${v.captions.map((c) => `**${c.pillar}**\n\n${c.text}`).join("\n\n")}\n\n_Replace every "[To complete: …]" with real facts before posting._\n`,
  );
}

/** Rend et enregistre le kit (PNG, planche d'ensemble, ZIP). Sans piste retenue (logo fourni, ancien logo) : rien. */
export async function saveSocialKit(projectId: string, opts: { route?: CreativeRoute | null; voiceAi?: ((p: Project) => Promise<Omit<SocialVoice, "generatedBy">>) | null } = {}) {
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
