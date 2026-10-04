/**
 * Calendrier éditorial : préparation de plusieurs jours de publications
 * complètes (texte, légende, média au bon format, date), puis programmation
 * réelle exécutée par le worker — même navigateur fermé.
 */
import { fromZonedTime } from "date-fns-tz";
import { loadImage } from "@napi-rs/canvas";
import { all, id, json, now, one, run, tx } from "../db";
import { addUsage, assetData, saveAsset, type Asset } from "../library";
import { loadProject, notify, type Project } from "../projects";
import { aiSocialPlan, type PostDraft } from "../ai/tasks";
import { llmConfigured } from "../ai/llm";
import { FORMATS, renderCreative, type FormatId } from "../media/compose";
import { brandTypo, ensureCutouts, latestAsset, palette, assetsByRole } from "./images";
import { enqueue, type JobContext } from "../jobs";
import { C, L, uiLang } from "../i18n-server";
import { intlLocale } from "../i18n";

/** Format vidéo accepté par chaque réseau (mêmes valeurs que les formats proposés dans l'éditeur de publication). */
export function videoFormat(net: string) {
  return net === "youtube" ? "short" : net === "instagram" ? "reel" : net === "pinterest" ? "pin" : "video";
}
import { contactCta, deName, howToBook, serviceShowcase, unknownText } from "./services-text";

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

const ANGLES = [
  { angle: "Le produit en détail", en: "The product up close", kind: "detail", layout: "minimal", ask: false },
  { angle: "Mise en situation", en: "In real life", kind: "scene", layout: "editorial", ask: false },
  { angle: "Ce qu'il contient", en: "What's inside", kind: "creative", layout: "bold", ask: false },
  { angle: "Question à la communauté", en: "Ask the community", kind: "creative", layout: "centered", ask: true },
  { angle: "Packshot", en: "Packshot", kind: "packshot", layout: "minimal", ask: false },
  { angle: "Coulisses de la marque", en: "Behind the brand", kind: "scene", layout: "split", ask: false },
] as const;

/** Plan local (sans IA) : angles variés, textes sobres fondés sur les faits connus. */
export function localPlan(p: Project, params: PlanParams): PostDraft[] {
  if (p.business === "services") return localServicePlan(p, params);
  const facts = p.product.facts.filter((f) => f.status !== "unknown" && f.value && f.value.length < 90);
  const name = p.product.name || p.brand?.name || C("notre produit", "our product");
  const more = params.link ? C("\nÀ découvrir sur la boutique.", "\nDiscover it in our store.") : "";
  const posts: PostDraft[] = [];
  let k = 0;
  for (let day = 0; day < params.days; day++) {
    for (let slot = 0; slot < params.perDay; slot++) {
      const net = params.networks[(day * params.perDay + slot) % params.networks.length].network as PostDraft["network"];
      const a = ANGLES[k % ANGLES.length];
      const fact = facts[k % Math.max(1, facts.length)];
      const wantsVideo = (net === "tiktok" || net === "youtube") || (k % 100) / 100 < params.mix.video / 100;
      const angle = C<string>(a.angle, a.en);
      const caption = a.ask
        ? C(`Comment utiliseriez-vous ${name} au quotidien ? Dites-le-nous en commentaire.`, `How would you use ${name} every day? Tell us in the comments.`)
        : fact
          ? C(`${name} — ${fact.label.toLowerCase()} : ${fact.value}.`, `${name} — ${fact.label.toLowerCase()}: ${fact.value}.`) + more
          : C(`${name}, vu de près.`, `${name}, up close.`) + more;
      posts.push({
        day,
        slot,
        network: net,
        format: wantsVideo ? videoFormat(net) : net === "pinterest" ? "pin" : "image",
        angle,
        title: a.kind === "packshot" ? name : C(`${name} : ${angle.toLowerCase()}`, `${name}: ${angle.toLowerCase()}`),
        caption,
        hashtags: [p.brand?.name, p.product.category, p.product.name].filter(Boolean).map((t) => String(t).replace(/\s+/g, "")).slice(0, 4),
        visual: { kind: wantsVideo ? "video" : (a.kind as any), headline: (fact?.value ?? p.brand?.tagline ?? name).slice(0, 40), subline: "", layout: a.layout as any },
      });
      k++;
    }
  }
  return posts;
}

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
  for (let day = 0; day < params.days; day++) {
    for (let slot = 0; slot < params.perDay; slot++) {
      const net = params.networks[(day * params.perDay + slot) % params.networks.length].network as PostDraft["network"];
      const a = angles[k % angles.length];
      const wantsVideo = net === "tiktok" || net === "youtube" || (k % 100) / 100 < params.mix.video / 100;
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
        hashtags: [...new Set(tags)].slice(0, 4),
        visual: { kind: wantsVideo ? "video" : a.kind, headline, subline: where && a.kind === "creative" ? where.slice(0, 40) : "", layout: a.layout },
      });
      k++;
    }
  }
  return posts;
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
  const drafts = await ctx.step("drafts", async () => {
    if (llmConfigured()) {
      const r = await aiSocialPlan({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:plan` }, p, { days: params.days, perDay: params.perDay, networks: params.networks.map((n) => n.network), goals: params.goals, tone: params.tone, mix: params.mix, link: params.link });
      run("UPDATE content_plans SET strategy = ? WHERE id = ?", r.strategy, planId);
      return r.posts;
    }
    run("UPDATE content_plans SET strategy = ? WHERE id = ?", L("Plan préparé par le moteur local : angles variés à partir des informations confirmées. Activez l'IA pour une stratégie rédigée sur mesure.", "Plan prepared by the local engine: varied angles based on confirmed information. Enable AI for a custom-written strategy."), planId);
    return localPlan(p, params);
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
          JSON.stringify(d.visual),
          key,
          now(),
          now(),
        );
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
    } else if (product) {
      const r = await renderCreative({ product, palette: palette(p), typo: brandTypo(p), format: FORMATS[fmt.image], layout: visual.layout, headline: visual.headline || p.product.name, subline: visual.subline || undefined, brand: p.brand?.name ?? p.name, logo, seed: i + 11 });
      const a = await saveAsset({ projectId, userId: p.userId, data: r.jpg, name: `${C("publication", "post")}-${post.network}-${new Date(post.scheduled_at).toISOString().slice(0, 10)}-${i + 1}.jpg`, mime: "image/jpeg", role: "social", folderKey: "content.calendar", origin: "generated", meta: { recipe: L(`Visuel ${FORMATS[fmt.image].label} pour ${fmt.label}`, `${FORMATS[fmt.image].label} visual for ${fmt.label}`), post: postId, safeArea: r.safe, minFontPx: r.minFontPx } });
      mediaIds = [a.id];
    }
    for (const m of mediaIds) addUsage(m, "post", postId, `${fmt.label} — ${new Date(post.scheduled_at).toLocaleDateString(intlLocale(uiLang()))}`);
    const status = !mediaIds.length && post.network !== "facebook" ? "draft" : decideStatus(p, post.network, post.connection_id, params.approval, mediaIds);
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
  const auto = approval === "auto" && rules.enabled && rules.networks.includes(network) && !!connectionId;
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
