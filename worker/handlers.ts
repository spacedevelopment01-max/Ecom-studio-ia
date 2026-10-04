/** Gestionnaires des tâches d'arrière-plan. */
import { all, json, now, one, run } from "../src/lib/db";
import { JobCancelled, JobContext, JobPaused, PermanentError, UserFacingError } from "../src/lib/jobs";
import { runPipeline } from "../src/lib/engine/pipeline";
import { generateImageSet, generateSingleImage } from "../src/lib/engine/images";
import { produceVideo } from "../src/lib/engine/videos";
import { produceUgc, writeUgcScript } from "../src/lib/engine/ugc";
import { buildShop, switchDirection, themeFileName } from "../src/lib/engine/shop";
import { createContentPlan, attachVideoToPlan, NETWORK_FORMATS } from "../src/lib/engine/calendar";
import { buildBrand } from "../src/lib/engine/brand";
import { loadProject, currentTheme, saveThemeVersion, themeVersion, listThemeVersions, remember, notify } from "../src/lib/projects";
import { aiThemeChat, aiRewritePost, aiClassify, aiShopCopyChecked, aiRepairOps } from "../src/lib/ai/tasks";
import { llmConfigured } from "../src/lib/ai/llm";
import { applyOps, validateSpec, type ThemeOp } from "../src/lib/theme/ops";
import { localThemeCommand } from "../src/lib/engine/local";
import { localCopy } from "../src/lib/engine/local-copy";
import { assetData, getAsset, saveAsset, listFolders, addUsage, type Asset } from "../src/lib/library";
import { publishPost, alreadyPublished, connectionFor, markConnection, type PostRow } from "../src/lib/social/publish";
import { sendToCanva, importFromCanva } from "../src/lib/integrations/canva";
import { pushCatalog, pushPages, pushTheme, shopifyConnection } from "../src/lib/integrations/shopify";
import { renderCreative, FORMATS } from "../src/lib/media/compose";
import { brandTypo, palette, ensureCutouts, latestAsset } from "../src/lib/engine/images";
import { loadImage } from "@napi-rs/canvas";
import { L } from "../src/lib/i18n-server";

type Handler = (ctx: JobContext) => Promise<unknown>;

export const handlers: Record<string, Handler> = {
  "pipeline.run": runPipeline,

  "images.generate": async (ctx) => generateImageSet(ctx, ctx.payload.projectId, ctx.payload.options ?? {}),
  "image.single": async (ctx) => generateSingleImage(ctx, ctx.payload.projectId, ctx.payload.request),

  "video.render": async (ctx) => {
    const projectId = ctx.job.project_id!;
    const r = await produceVideo(ctx, projectId, { format: ctx.payload.format, goal: ctx.payload.goal, useAiClip: !!ctx.payload.useAiClip, music: ctx.payload.music, url: ctx.payload.url, target: ctx.payload.target });
    if (ctx.payload.attachPlan) attachVideoToPlan(ctx.payload.attachPlan, r.assetId);
    return r;
  },

  /** Script UGC à relire et modifier avant la génération. */
  "ugc.script": async (ctx) => writeUgcScript(ctx, ctx.job.project_id!, ctx.payload.options),
  "video.ugc": async (ctx) => produceUgc(ctx, ctx.job.project_id!, { options: ctx.payload.options, script: ctx.payload.script }),

  "brand.build": async (ctx) => {
    const b = await buildBrand(ctx, ctx.payload.projectId, { guidance: ctx.payload.guidance });
    return { name: b.name };
  },

  "copy.build": async (ctx) => {
    const p = loadProject(ctx.payload.projectId);
    if (llmConfigured()) {
      const r = await aiShopCopyChecked({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: `${ctx.job.id}:copy` }, p, (m) => ctx.progress(0.5, m));
      remember(p.id, { kind: "artifact", key: "shop_copy", value: JSON.stringify(r.copy), source: "ai" });
      return r.qc;
    }
    remember(p.id, { kind: "artifact", key: "shop_copy", value: JSON.stringify(localCopy(p.product, p.brand!, p)), source: "local" });
    return { local: true };
  },

  "shop.build": async (ctx) => buildShop(ctx, ctx.payload.projectId, { useAi: ctx.payload.useAi }),
  "shop.direction": async (ctx) => switchDirection(ctx, ctx.payload.projectId, ctx.payload.direction),

  /** Retouche du thème par conversation : opérations ciblées, nouvelle version. */
  "shop.chat": async (ctx) => {
    const { projectId, messageId, message, selection, attachments, page } = ctx.payload;
    const p = loadProject(projectId);
    const cur = currentTheme(projectId);
    if (!cur) throw new UserFacingError(L("Créez d'abord la boutique.", "Create the store first."));
    const history = all<{ role: string; content: string }>("SELECT role, content FROM chat_messages WHERE project_id = ? AND thread = 'shop' AND id != ? ORDER BY created_at DESC LIMIT 10", projectId, messageId).reverse();
    const atts = (attachments as string[]).map((aid) => getAsset(aid)).filter((a): a is Asset => !!a && a.project_id === projectId);
    ctx.progress(0.1, L("Lecture de la demande", "Reading the request"));
    let reply: string;
    let ops: ThemeOp[] = [];
    let revert = false;
    let switchTo: string | undefined;
    let mode: "ai" | "local" = "local";
    if (llmConfigured()) {
      mode = "ai";
      const r = await ctx.step("ai", () =>
        aiThemeChat({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:chat` }, p, cur.spec, {
          message,
          selection,
          attachments: atts.map((a) => ({ assetId: a.id, name: a.name, image: a.kind === "image" ? assetData(a) : undefined })),
          page: page || "index",
          history,
        }),
      );
      reply = r.reply;
      ops = r.ops;
      revert = r.revert;
      for (const m of r.remember) remember(projectId, { kind: "preference", key: m.key, value: m.value, scope: m.scope, source: "user" });
    } else {
      const r = localThemeCommand(cur.spec, message, selection, p.business);
      reply = r.reply;
      ops = r.ops;
      revert = r.revert;
      switchTo = r.direction;
    }
    ctx.progress(0.7, L("Application des modifications", "Applying the changes"));
    let versionId: string | null = null;
    let applied: string[] = [];
    let rejected: { reason: string }[] = [];
    if (revert) {
      const versions = listThemeVersions(projectId);
      const prev = versions.find((v) => v.id === cur.version.parent_id) ?? versions[1];
      if (!prev) reply = L("Il n'y a pas de version précédente.", "There is no previous version.");
      else {
        const old = themeVersion(projectId, prev.id)!;
        versionId = saveThemeVersion(projectId, old.spec, L(`Retour à la version ${prev.number}`, `Back to version ${prev.number}`), "user").id;
        applied = [L(`Version ${prev.number} restaurée`, `Version ${prev.number} restored`)];
      }
    } else if (switchTo) {
      const r = await switchDirection(ctx, projectId, switchTo as any);
      versionId = r.versionId;
      applied = [`Direction ${switchTo}`];
    } else if (ops.length) {
      const targeted = new Set<string>();
      if (selection) targeted.add(`${selection.template}:${selection.section}`);
      const mediaFile = (assetId: string) => {
        const a = getAsset(assetId);
        return a && a.project_id === projectId ? { filename: themeFileName(a, a.role ?? "media") } : null;
      };
      const res = applyOps(cur.spec, ops, { targeted, mediaFile });
      let next = res.spec;
      applied = res.applied;
      let refused = res.rejected;
      // Auto-correction : l'IA reçoit les motifs exacts des refus et propose des opérations corrigées (une passe).
      if (mode === "ai" && refused.length) {
        try {
          ctx.progress(0.8, L("Correction des opérations refusées", "Fixing the rejected operations"));
          const fix = await ctx.step("repair", () => aiRepairOps({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:repair` }, p, next, { request: message, page: page || "index", rejected: refused }));
          if (fix.ops.length) {
            const again = applyOps(next, fix.ops, { targeted, mediaFile });
            if (again.applied.length && !validateSpec(again.spec).length) {
              next = again.spec;
              applied = [...applied, ...again.applied];
              refused = again.rejected;
              ops = [...ops, ...fix.ops];
            }
          }
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
          console.warn("[chat] auto-correction indisponible :", (e as Error).message);
        }
      }
      rejected = refused.map((x) => ({ reason: x.reason }));
      const problems = validateSpec(next);
      if (problems.length) throw new PermanentError(L(`La modification rendrait le thème invalide : ${problems.join(" ; ")}`, `This change would make the theme invalid: ${problems.join("; ")}`));
      if (applied.length) {
        versionId = saveThemeVersion(projectId, next, `${message.slice(0, 120)}`, mode === "ai" ? "ai" : "user", { applied, rejected: refused.map((x) => x.reason) }).id;
        for (const op of ops) if (op.op === "use_media") addUsage(op.assetId, "theme_section", `${op.template}:${op.section}`, L("Section de boutique", "Store section"));
      }
    }
    const note = [reply, applied.length ? L(`\n\nModifié : ${applied.join(" ; ")}.`, `\n\nChanged: ${applied.join("; ")}.`) : "", rejected.length ? L(`\n\nNon appliqué : ${rejected.map((r) => r.reason).join(" ; ")}.`, `\n\nNot applied: ${rejected.map((r) => r.reason).join("; ")}.`) : ""].join("");
    run("INSERT INTO chat_messages (id, project_id, thread, role, content, theme_version_id, job_id, created_at) VALUES (?,?,?,?,?,?,?,?)", `${messageId}-r`, projectId, "shop", "assistant", note.trim(), versionId, ctx.job.id, now());
    return { versionId, applied, rejected, mode };
  },

  "calendar.plan": async (ctx) => createContentPlan(ctx, ctx.payload.projectId, ctx.payload.params),

  /** Régénère le texte et/ou le visuel d'une publication. */
  "post.regenerate": async (ctx) => {
    const { postId, instruction, part } = ctx.payload;
    const post = one<any>("SELECT * FROM posts WHERE id = ?", postId);
    if (!post) throw new PermanentError(L("Publication introuvable.", "Post not found."));
    if (["published", "publishing"].includes(post.status)) throw new UserFacingError(L("Une publication déjà envoyée ne peut pas être régénérée.", "A post that has already been sent cannot be regenerated."));
    const p = loadProject(post.project_id);
    if (part !== "media") {
      if (!llmConfigured()) throw new UserFacingError(L("La réécriture des légendes nécessite l'IA : elle est disponible avec l'abonnement et l'IA connectée.", "Rewriting captions requires AI: it is available with a subscription and a connected AI provider."));
      const r = await aiRewritePost({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: `${ctx.job.id}:rewrite` }, p, post, instruction ?? "");
      run("UPDATE posts SET title = ?, caption = ?, hashtags = ?, status = CASE WHEN status = 'scheduled' THEN 'review' ELSE status END, updated_at = ? WHERE id = ?", r.title, r.caption, r.hashtags.join(" "), now(), postId);
    }
    if (part !== "text") {
      const cut = (await ensureCutouts(ctx, p))[0];
      if (cut) {
        const visual = json<any>(post.brief, {});
        const fmt = NETWORK_FORMATS[post.network] ?? NETWORK_FORMATS.instagram;
        const logoA = latestAsset(p.id, "logo");
        const layouts = ["editorial", "bold", "minimal", "centered", "split"] as const;
        const r = await renderCreative({ product: await loadImage(assetData(cut)), palette: palette(p), typo: brandTypo(p), format: FORMATS[fmt.image], layout: layouts[Math.floor(Math.random() * layouts.length)], headline: instruction || visual.headline || p.product.name, brand: p.brand?.name ?? p.name, logo: logoA ? await loadImage(assetData(logoA)) : null, seed: Date.now() % 997 });
        const a = await saveAsset({ projectId: p.id, userId: p.userId, data: r.jpg, name: L(`publication-${post.network}-regeneree-${Date.now().toString(36)}.jpg`, `post-${post.network}-regenerated-${Date.now().toString(36)}.jpg`), mime: "image/jpeg", role: "social", folderKey: "content.calendar", origin: "generated", meta: { post: postId, recipe: L("Visuel régénéré", "Regenerated visual") } });
        run("UPDATE posts SET media = ?, status = CASE WHEN status = 'scheduled' THEN 'review' ELSE status END, updated_at = ? WHERE id = ?", JSON.stringify([a.id]), now(), postId);
        addUsage(a.id, "post", postId, L("Publication", "Post"));
      }
    }
    return { ok: true };
  },

  /**
   * Publication programmée : transition atomique scheduled → publishing,
   * vérification anti-doublon côté plateforme, puis publication.
   */
  "post.publish": async (ctx) => {
    const { postId } = ctx.payload;
    const claimed = run("UPDATE posts SET status = 'publishing', attempts = attempts + 1, updated_at = ? WHERE id = ? AND status IN ('scheduled','publishing')", now(), postId);
    if (!claimed.changes) return { skipped: "état modifié (annulée, déplacée ou déjà publiée)" };
    const post = one<PostRow & { user_id: string }>("SELECT p.*, pr.user_id FROM posts p JOIN projects pr ON pr.id = p.project_id WHERE p.id = ?", postId)!;
    const c = connectionFor(post.connection_id, post.user_id);
    try {
      if (!c) throw new PermanentError(L("Aucun compte connecté pour cette publication. Choisissez un compte puis reprogrammez.", "No account connected for this post. Choose an account, then reschedule."));
      const existing = await alreadyPublished(post, c);
      if (existing) {
        run("UPDATE posts SET status = 'published', remote_id = ?, published_at = ?, error = NULL, updated_at = ? WHERE id = ?", existing, now(), now(), postId);
        return { remoteId: existing, deduplicated: true };
      }
      ctx.progress(0.3, L(`Envoi vers ${c.provider}`, `Sending to ${c.provider}`));
      const r = await publishPost(post, c);
      run("UPDATE posts SET status = 'published', remote_id = ?, remote_url = ?, published_at = ?, error = ?, updated_at = ? WHERE id = ?", r.remoteId, r.url ?? null, now(), r.note ?? null, now(), postId);
      return r;
    } catch (e: any) {
      if (e?.reconnect && c) markConnection(c, "expired", e.message);
      const permanent = e instanceof PermanentError || ctx.job.attempts >= ctx.job.max_attempts;
      run("UPDATE posts SET status = ?, error = ?, updated_at = ? WHERE id = ?", permanent ? "failed" : "scheduled", String(e?.message ?? e).slice(0, 1000), now(), postId);
      if (permanent) notify(post.user_id, post.project_id, L("Une publication a échoué", "A post failed"), L(`${post.network} : ${String(e?.message ?? e).slice(0, 200)}`, `${post.network}: ${String(e?.message ?? e).slice(0, 200)}`), "error");
      throw e;
    }
  },

  "files.classify": async (ctx) => {
    const projectId = ctx.payload.projectId;
    const p = loadProject(projectId);
    const folders = listFolders(projectId).filter((f) => f.system_key);
    const loose = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND folder_id IS NULL AND deleted_at IS NULL LIMIT 60", projectId);
    if (!loose.length) return { moved: 0 };
    const rules: [RegExp, string][] = [
      [/logo/, "brand.logos"],
      [/cutout|detour/, "product.cutouts"],
      [/packshot/, "images.packshots"],
      [/detail/, "images.details"],
      [/scene/, "images.scenes"],
      [/banner|banniere/, "images.banners"],
      [/ad|publicite/, "images.ads"],
      [/social|post/, "images.social"],
      [/video/, "videos.social"],
    ];
    let items: { id: string; folder: string; name?: string }[];
    if (llmConfigured()) {
      const r = await aiClassify({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:classify` }, loose.map((a) => ({ id: a.id, name: a.name, kind: a.kind, role: a.role, meta: a.meta })), folders.map((f) => ({ key: f.system_key!, name: f.name })));
      items = r.items;
    } else {
      items = loose.map((a) => {
        const k = `${a.role ?? ""} ${a.name}`.toLowerCase();
        const hit = rules.find(([re]) => re.test(k));
        return { id: a.id, folder: hit?.[1] ?? (a.kind === "video" ? "videos.social" : a.kind === "image" ? "product.originals" : "docs") };
      });
    }
    let moved = 0;
    for (const it of items) {
      const f = folders.find((x) => x.system_key === it.folder);
      const a = loose.find((x) => x.id === it.id);
      if (!f || !a) continue;
      const ext = a.name.includes(".") ? a.name.slice(a.name.lastIndexOf(".")) : "";
      // Le classement déplace et renomme ; il ne supprime jamais.
      run("UPDATE assets SET folder_id = ?, name = ? WHERE id = ?", f.id, it.name ? `${it.name.replace(/[^\p{L}\p{N}-]+/gu, "-").slice(0, 80)}${ext}` : a.name, a.id);
      moved++;
    }
    return { moved };
  },

  "canva.send": async (ctx) => {
    const a = getAsset(ctx.payload.assetId);
    if (!a) throw new PermanentError(L("Média introuvable.", "Media not found."));
    return sendToCanva(ctx.job.user_id, a);
  },
  "canva.import": async (ctx) => {
    const a = getAsset(ctx.payload.assetId);
    if (!a) throw new PermanentError(L("Média introuvable.", "Media not found."));
    return { assets: await importFromCanva(ctx.job.user_id, a, ctx.payload.format ?? "png") };
  },

  "shopify.push": async (ctx) => {
    const { projectId, parts } = ctx.payload as { projectId: string; parts: ("theme" | "product" | "pages")[] };
    const c = shopifyConnection(ctx.job.user_id, projectId);
    if (!c) throw new PermanentError(L("Connectez votre boutique Shopify dans l'onglet Connexions.", "Connect your Shopify store in the Connections tab."));
    const cur = currentTheme(projectId);
    if (!cur) throw new PermanentError(L("Aucune boutique à installer.", "No store to install."));
    const out: Record<string, unknown> = {};
    if (parts.includes("product")) out.product = await ctx.step("product", async () => (ctx.progress(0.1, L("Création des produits dans Shopify", "Creating the products in Shopify")), pushCatalog(c, cur.spec, (d, t) => ctx.progress(0.1 + (d / t) * 0.35, L(`Produit ${d}/${t} envoyé`, `Product ${d}/${t} sent`)))));
    if (parts.includes("pages")) out.pages = await ctx.step("pages", async () => (ctx.progress(0.5, L("Création des pages", "Creating the pages")), pushPages(c, cur.spec)));
    if (parts.includes("theme")) out.theme = await ctx.step("theme", async () => (ctx.progress(0.8, L("Installation du thème (non publié)", "Installing the theme (unpublished)")), pushTheme(c, projectId, cur.version.id, cur.spec.name)));
    notify(ctx.job.user_id, projectId, L("Envoi vers Shopify terminé", "Sending to Shopify complete"), Object.keys(out).join(", "), "success");
    return out;
  },
};

export const HANDLER_TYPES = Object.keys(handlers);
