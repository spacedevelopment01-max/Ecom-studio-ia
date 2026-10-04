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
        format: wantsVideo ? (net === "youtube" ? "short" : "reel") : net === "pinterest" ? "pin" : "image",
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
