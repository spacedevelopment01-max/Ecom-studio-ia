/** Gestionnaires des tâches d'arrière-plan. */
import { isAutoUsable } from "../src/lib/quality/usable";
import { all, json, now, one, run } from "../src/lib/db";
import { sectionGenerationAllowed } from "../src/lib/theme/custom-access";
import { JobCancelled, JobContext, JobPaused, PermanentError, UserFacingError } from "../src/lib/jobs";
import { runPipeline } from "../src/lib/engine/pipeline";
import { generateImageSet, generateSingleImage } from "../src/lib/engine/images";
import { produceVideo } from "../src/lib/engine/videos";
import { produceUgc, writeUgcScript } from "../src/lib/engine/ugc";
import { writeBlogArticle } from "../src/lib/engine/blog";
import { withQuotaScope } from "../src/lib/ai/access";
import { consumeQuota } from "../src/lib/quotas";
import { buildShop, switchDirection, themeFileName } from "../src/lib/engine/shop";
import { buildCustomTheme } from "../src/lib/engine/custom-theme";
import { createContentPlan, attachVideoToPlan, NETWORK_FORMATS, quotedHeadline, rewritePostChecked } from "../src/lib/engine/calendar";
import { honestChatNote } from "../src/lib/engine/shop-chat";
import { localFirst } from "../src/lib/engine/local-first";
import { REPLACE_INTENT, isMediaSelection, localMediaReplace, mediaTargetOf } from "../src/lib/theme/image-target";
import { buildBrand } from "../src/lib/engine/brand";
import { runLogoJob } from "../src/lib/engine/logo-job";
import { loadProject, currentTheme, saveThemeVersion, themeVersion, listThemeVersions, remember, notify } from "../src/lib/projects";
import { aiThemeChat, aiRewritePost, aiClassify, aiShopCopyChecked, aiRepairOps } from "../src/lib/ai/tasks";
import { llmConfigured } from "../src/lib/ai/llm";
import { applyOps, validateSpec, type ThemeOp } from "../src/lib/theme/ops";
import { localThemeCommand } from "../src/lib/engine/local";
import { localCopy } from "../src/lib/engine/local-copy";
import { assetData, getAsset, saveAsset, listFolders, addUsage, type Asset } from "../src/lib/library";
import { publishPost, alreadyPublished, connectionFor, markConnection, type PostRow } from "../src/lib/social/publish";
import { sendToCanva, importFromCanva } from "../src/lib/integrations/canva";
import { pushCatalog, pushPages, pushTheme, seoSummary, shopifyConnection, type SeoPushResult } from "../src/lib/integrations/shopify";
import { renderCreative, FORMATS } from "../src/lib/media/compose";
import { brandTypo, palette, ensureCutouts, latestAsset } from "../src/lib/engine/images";
import { cutoutSummary, redoCutout } from "../src/lib/engine/cutouts";
import { loadImage } from "@napi-rs/canvas";
import { L, contentLang } from "../src/lib/i18n-server";
import { planOfUserId } from "../src/lib/plan-gates";
import { ACTION_STEPS, findStockPhotos, orchestrated, runRequestPlan } from "../src/lib/orchestrator/execute";

type Handler = (ctx: JobContext) => Promise<unknown>;

export const handlers: Record<string, Handler> = {
  // Création complète : passe par le planner à l'intérieur (étapes déjà acquises sautées, marque existante gardée).
  "pipeline.run": runPipeline,

  /** Demande libre du client : intention → plan → moteurs existants (Router V2, barrière de qualité). */
  "plan.run": runRequestPlan,
  // Studio Workflow V2 (phase 12A) : demande globale → plan de l'orchestrateur → moteurs V2 (devis autorisé, plafond).
  "workflow.run": async (ctx) => (await import("../src/lib/workflow")).runWorkflow(ctx),

  /** Photos libres de droits (gratuites, contrôlées) avant toute image IA. */
  "stock.search": async (ctx) => findStockPhotos(ctx, ctx.payload.projectId, ctx.payload.n ?? 2),

  /** Tri des photos du produit, détourage et contrôle (ajout d'une photo, « Refaire le détourage »). */
  "cutout.run": async (ctx) => {
    const project = loadProject(ctx.payload.projectId);
    const list = ctx.payload.redo ? await redoCutout(ctx, project, ctx.payload.redo) : await ensureCutouts(ctx, project);
    return { valid: list.length, summary: cutoutSummary(project.id) };
  },

  /** Jeu d'images : Image Engine V2 (composants locaux, photos libres, génération contrôlée). */
  "images.generate": async (ctx) => {
    const { runImageSetV2 } = await import("../src/lib/image-v2/set");
    return runImageSetV2(ctx, ctx.payload.projectId);
  },
  "image.single": async (ctx) => generateSingleImage(ctx, ctx.payload.projectId, ctx.payload.request),
  /** Publicités V2 : angles, textes contrôlés, créations composées (Image V2), barrière publicitaire. */
  "ads.v2": async (ctx) => {
    const { runAdEngineV2 } = await import("../src/lib/ads-v2/engine");
    const r = await runAdEngineV2(ctx, ctx.payload.projectId, ctx.payload.request ?? {});
    return { concepts: r.concepts.length, outcomes: r.outcomes.map((o) => ({ verdict: o.verdict, assetId: o.assetId, platform: o.platform, aspect: o.aspect })), stoppedByCostCap: r.stoppedByCostCap, stats: r.stats };
  },
  /** Image V2 : brief local, recherche multisource ou génération routée, barrière V2, bibliothèque, réutilisation. */
  "image.v2": async (ctx) => {
    const { runImageEngineV2 } = await import("../src/lib/image-v2/engine");
    const r = await runImageEngineV2(ctx, ctx.payload.projectId, ctx.payload.request);
    return { outcomes: r.outcomes.map((o) => ({ verdict: o.verdict, assetId: o.assetId, origin: o.origin, score: o.score })), stoppedByCostCap: r.stoppedByCostCap, stats: r.stats };
  },

  /** SEO & Copywriting V2 : stratégie, brief, rédaction (locale puis IA contrôlée), barrière SEO, document versionné. */
  "content.v2": async (ctx) => {
    const { runContentEngineV2 } = await import("../src/lib/seo-v2/engine");
    const r = await runContentEngineV2(ctx, ctx.payload.projectId, ctx.payload.request);
    return { docKey: r.docKey, verdict: r.verdict, codes: r.codes, by: r.by, costMicro: r.costMicro, skipped: r.skipped, stoppedByCostCap: r.stoppedByCostCap, stats: r.stats, notes: r.notes.slice(0, 20) };
  },
  /** Vidéo V2 : intention, stratégie, script, storyboard, plans, document éditable, rendu, barrière vidéo. */
  "video.v2": async (ctx) => {
    const { runVideoEngineV2 } = await import("../src/lib/video-v2/engine");
    const r = await runVideoEngineV2(ctx, ctx.payload.projectId, ctx.payload.request);
    return { docKey: r.docKey, videoAssetId: r.videoAssetId, verdict: r.verdict, codes: r.codes, estimateMicro: r.estimateMicro, stoppedByCostCap: r.stoppedByCostCap, stats: r.stats, notes: r.notes.slice(0, 20) };
  },
  /** Vidéo V2 : nouveau rendu du document enregistré (local, gratuit), rangé dans la bibliothèque. */
  "video.v2.render": async (ctx) => {
    const { renderLatest } = await import("../src/lib/video-v2/engine");
    return renderLatest(ctx, ctx.payload.projectId, ctx.payload.docKey);
  },
  /** Vidéo V2 : un seul plan remplacé (génération acceptée par le client), les autres plans intacts. */
  "video.v2.clip": async (ctx) => {
    const { regenerateClip } = await import("../src/lib/video-v2/engine");
    const r = await regenerateClip(ctx, ctx.payload.projectId, ctx.payload.docKey, ctx.payload.clipId, { approve: !!ctx.payload.approve, maxCostEur: ctx.payload.maxCostEur, instruction: ctx.payload.instruction });
    return { outcome: r.outcome, notes: r.notes };
  },

  "video.render": async (ctx) => {
    const projectId = ctx.job.project_id!;
    const r = await produceVideo(ctx, projectId, { format: ctx.payload.format, goal: ctx.payload.goal, useAiClip: !!ctx.payload.useAiClip, music: ctx.payload.music, url: ctx.payload.url, target: ctx.payload.target });
    if (ctx.payload.attachPlan) attachVideoToPlan(ctx.payload.attachPlan, r.assetId);
    return r;
  },

  /** Script UGC à relire et modifier avant la génération. */
  "ugc.script": async (ctx) => writeUgcScript(ctx, ctx.job.project_id!, ctx.payload.options),
  // La vidéo UGC compte pour une vidéo UGC du forfait, une fois terminée (ses images et plans ne sont pas décomptés à part).
  "video.ugc": async (ctx) => {
    const r = await withQuotaScope("ugc", () => produceUgc(ctx, ctx.job.project_id!, { options: ctx.payload.options, script: ctx.payload.script }));
    consumeQuota(ctx.job.user_id!, "ugc", 1, `ugc:${ctx.job.id}`);
    return r;
  },

  /** Article de blog écrit (ou réécrit) par l'IA : 1 article du forfait, décompté une fois l'article enregistré. */
  "blog.write": async (ctx) => writeBlogArticle(ctx, ctx.job.project_id!, { topic: ctx.payload.topic, brief: ctx.payload.brief, articleId: ctx.payload.articleId, instruction: ctx.payload.instruction, keyword: ctx.payload.keyword, intent: ctx.payload.intent }),

  /** Logo : nouvelles pistes (IA, plusieurs minutes) ou application de la piste choisie. */
  "brand.fulllogo": async (ctx) => {
    const { generateFullLogos } = await import("../src/lib/engine/full-logo");
    return { created: (await generateFullLogos(ctx, ctx.payload.projectId, { autoApply: !!ctx.job.parent_id })).length };
  },

  /** Logo V2 : territoires créatifs, construction hybride, barrière V2 (aucun mockup avant le choix). */
  "brand.logo.v2": async (ctx) => {
    const { runLogoEngineV2 } = await import("../src/lib/logo-v2/engine");
    const r = await runLogoEngineV2(ctx, ctx.payload.projectId, { avoid: ctx.payload.avoid });
    return { shown: r.shown.length, discarded: r.discarded.length, territories: r.territories.length, stoppedByCostCap: r.stoppedByCostCap };
  },
  /** Logo V2 choisi : décision du client, déclinaisons, système de marque. */
  "brand.logo.v2.choose": async (ctx) => {
    const { chooseLogoV2 } = await import("../src/lib/logo-v2/choose");
    return chooseLogoV2(ctx, ctx.payload.projectId, ctx.payload.assetId);
  },
  "brand.logo": async (ctx) => runLogoJob(ctx, ctx.payload.projectId, { proposalId: ctx.payload.proposalId ?? null, regenerate: !!ctx.payload.regenerate }),

  "brand.build": async (ctx) => {
    const b = await buildBrand(ctx, ctx.payload.projectId, { guidance: ctx.payload.guidance });
    return { name: b.name };
  },

  "copy.build": async (ctx) => {
    const p = loadProject(ctx.payload.projectId);
    if (llmConfigured()) {
      const r = await aiShopCopyChecked({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: `${ctx.job.id}:copy` }, p, (m) => ctx.progress(0.5, m), (k, fn) => ctx.step(k, fn));
      remember(p.id, { kind: "artifact", key: "shop_copy", value: JSON.stringify(r.copy), source: "ai" });
      return r.qc;
    }
    remember(p.id, { kind: "artifact", key: "shop_copy", value: JSON.stringify(localCopy(p.product, p.brand!, p)), source: "local" });
    return { local: true };
  },

  "shop.build": async (ctx) => buildShop(ctx, ctx.payload.projectId, { useAi: ctx.payload.useAi, engine: ctx.payload.engine, language: ctx.payload.language }),
  "shop.direction": async (ctx) => switchDirection(ctx, ctx.payload.projectId, ctx.payload.direction),
  /** Thème entièrement sur mesure (forfait Dominer) : plan, puis chaque section écrite par l'IA, Theme Check, nouvelle version. */
  "theme.custom": async (ctx) => buildCustomTheme(ctx, ctx.payload.projectId),

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
    // Image désignée + image jointe : l'emplacement exact (réglage *_asset) est retrouvé sans IA.
    const firstMedia = atts.find((a) => a.kind === "image" || a.kind === "video" || a.kind === "logo");
    const mediaTarget = firstMedia && isMediaSelection(selection) ? mediaTargetOf(cur.spec, selection, firstMedia.kind === "video" ? "video" : "image") : null;
    const mediaFileOf = (assetId: string) => {
      const a = getAsset(assetId);
      return a && a.project_id === projectId ? { filename: themeFileName(a, a.role ?? "media") } : null;
    };
    // Le moteur local d'abord : une retouche simple qu'il sait faire à coup sûr ne consomme aucun crédit IA.
    const quick = llmConfigured() ? localFirst(cur.spec, message, selection, atts.map((a) => ({ assetId: a.id, name: a.name, kind: a.kind })), p.business, mediaFileOf) : null;
    if (quick) {
      reply = `${quick.reply}\n\n${L("⚡ Fait par le moteur du studio, sans IA : aucun crédit utilisé.", "⚡ Done by the studio engine, without AI: no credits used.")}`;
      ops = quick.ops;
      revert = quick.revert;
      switchTo = quick.direction;
    } else if (llmConfigured()) {
      mode = "ai";
      const r = await ctx.step("ai", () =>
        aiThemeChat({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:chat` }, p, cur.spec, {
          message,
          selection: selection && mediaTarget ? { ...selection, mediaKey: mediaTarget.key, mediaBlock: mediaTarget.block } : selection,
          attachments: atts.map((a) => ({ assetId: a.id, name: a.name, image: a.kind === "image" ? assetData(a) : undefined })),
          page: page || "index",
          history,
        }),
      );
      reply = r.reply;
      ops = r.ops;
      revert = r.revert;
      // Filet de sécurité : remplacement demandé sur une image désignée mais oublié par l'IA.
      if (mediaTarget && firstMedia && !revert && REPLACE_INTENT.test(message) && !ops.some((o) => o.op === "use_media")) {
        ops.push({ op: "use_media", template: mediaTarget.template, section: mediaTarget.section, ...(mediaTarget.block ? { block: mediaTarget.block } : {}), key: mediaTarget.key, assetId: firstMedia.id });
      }
      // Sections sur mesure écrites par l'IA : forfaits Vendre et Dominer seulement (Créer : sections de la bibliothèque).
      const owner = one<{ id: string; role: "client" | "admin" }>("SELECT id, role FROM users WHERE id = ?", p.userId);
      if (owner && ops.some((o) => o.op === "custom_section") && !sectionGenerationAllowed(owner)) {
        ops = ops.filter((o) => o.op !== "custom_section");
        reply += L(
          "\n\nUne partie de la demande demandait une section sur mesure écrite par l'IA : elle est incluse dans les forfaits Vendre et Dominer. J'ai fait le reste avec les sections de la bibliothèque.",
          "\n\nPart of the request needed a custom section written by AI: it's included in the Sell and Dominate plans. I did the rest with the library sections.",
        );
      }
      // Préférences DÉDUITES par l'IA de la demande du client : provenance honnête (déduction, priorité inférieure).
      for (const m of r.remember) remember(projectId, { kind: "preference", key: m.key, value: m.value, scope: m.scope, source: "ai", status: "inferred", origin: "inference" });
    } else {
      const media = localMediaReplace(cur.spec, message, selection, atts.map((a) => ({ assetId: a.id, name: a.name, kind: a.kind })));
      if (media) {
        reply = media.reply;
        ops = media.ops;
      } else {
        const r = localThemeCommand(cur.spec, message, selection, p.business);
        reply = r.reply;
        ops = r.ops;
        revert = r.revert;
        switchTo = r.direction;
      }
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
      const res = applyOps(cur.spec, ops, { targeted, mediaFile: mediaFileOf });
      let next = res.spec;
      applied = res.applied;
      let refused = res.rejected;
      // Auto-correction : l'IA reçoit les motifs exacts des refus et propose des opérations corrigées (une passe).
      if (mode === "ai" && refused.length) {
        try {
          ctx.progress(0.8, L("Correction des opérations refusées", "Fixing the rejected operations"));
          const fix = await ctx.step("repair", () => aiRepairOps({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:repair` }, p, next, { request: message, page: page || "index", rejected: refused }));
          if (fix.ops.length) {
            const again = applyOps(next, fix.ops, { targeted, mediaFile: mediaFileOf });
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
    // Jamais de fausse affirmation : l'IA décrit ce qu'elle compte faire ; seul ce qui a été appliqué et validé est
    // annoncé comme fait (rien d'appliqué → on le dit ; en partie → on le dit, avec ce qui ne l'a pas été).
    const note = honestChatNote({ reply, mode, revert, opsCount: ops.length + (switchTo ? 1 : 0), applied, rejected: rejected.map((r) => r.reason) });
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
      let n = 0;
      const r = await rewritePostChecked(post, p, (fix) => aiRewritePost({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: `${ctx.job.id}:rewrite${n++ ? `:${n}` : ""}` }, p, post, fix ?? instruction ?? ""));
      const brief = { ...json<any>(post.brief, {}), claims: r.claims?.length ? r.claims : undefined };
      run("UPDATE posts SET title = ?, caption = ?, hashtags = ?, brief = ?, error = ?, status = CASE WHEN status = 'scheduled' THEN 'review' ELSE status END, updated_at = ? WHERE id = ?", r.title, r.caption, r.hashtags.join(" "), JSON.stringify(brief), r.claims?.length ? L(`À vérifier avant publication : ${r.claims.join(", ")}`, `Check before publishing: ${r.claims.join(", ")}`) : null, now(), postId);
    }
    if (part !== "text") {
      // Détourage réutilisable automatiquement seulement (jamais un refusé ni un « à vérifier »).
      const cut = (await ensureCutouts(ctx, p)).filter(isAutoUsable)[0];
      if (cut) {
        const visual = json<any>(post.brief, {});
        const fmt = NETWORK_FORMATS[post.network] ?? NETWORK_FORMATS.instagram;
        const logoA = latestAsset(p.id, "logo");
        const layouts = ["editorial", "bold", "minimal", "centered", "split"] as const;
        const r = await renderCreative({ product: await loadImage(assetData(cut)), palette: palette(p), typo: brandTypo(p), format: FORMATS[fmt.image], layout: layouts[Math.floor(Math.random() * layouts.length)], headline: quotedHeadline(instruction) || visual.headline || p.product.name, brand: p.brand?.name ?? p.name, logo: logoA ? await loadImage(assetData(logoA)) : null, seed: Date.now() % 997 });
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
  /** Social V2 — niveau 2 : production d'un lot (payante seulement avec l'estimation acceptée, dans le plafond). */
  "social.v2.produce": async (ctx) => {
    const { produceBatch } = await import("../src/lib/social-v2/production");
    const { realSocialDeps } = await import("../src/lib/social-v2/deps");
    const { aiActiveFor } = await import("../src/lib/ai/access");
    const p = loadProject(ctx.payload.projectId);
    const deps = realSocialDeps(ctx, p, aiActiveFor(p.userId));
    return ctx.step("produce", () => produceBatch(p, ctx.payload.ids ?? [], deps, { allowPaid: !!ctx.payload.allowPaid, maxCostEur: Number(ctx.payload.maxCostEur ?? 0), approvedEstimateMicro: ctx.payload.approvedEstimateMicro ?? null }));
  },
  "post.publish": async (ctx) => {
    // Social Engine V2 : prise en charge atomique, version approuvée, journal des tentatives, état incertain en cas
    // de réponse perdue (jamais de nouvel envoi à l'aveugle). Le résultat est enregistré sur la publication.
    const { publishOne } = await import("../src/lib/social-v2/scheduler");
    const { realPublisher } = await import("../src/lib/social-v2/deps");
    ctx.progress(0.3, L("Envoi de la publication", "Sending the post"));
    const r = await publishOne(ctx.payload.postId, realPublisher);
    return r.outcome === "skipped" ? { skipped: r.detail } : r;
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
    // Contrôles du CMS Engine V2 AVANT tout envoi (même export que le bouton « Exporter ») : un export refusé
    // n'est jamais envoyé vers la boutique réelle.
    const checked = await ctx.step("cms-v2-check", async () => {
      const { exportAndRecord } = await import("../src/lib/cms-v2/record");
      const r = await exportAndRecord({ id: projectId, userId: ctx.job.user_id }, { spec: cur.spec, number: cur.version.number, id: cur.version.id }, "shopify", contentLang() === "en" ? "en" : "fr", { jobId: ctx.job.id });
      return { verdict: r.verdict, message: r.message, issues: r.issues };
    });
    if (checked.verdict === "REJECTED") throw new PermanentError(`${L("Envoi bloqué par le contrôle de l'export Shopify : ", "Sending blocked by the Shopify export check: ")}${checked.message}`);
    const out: Record<string, unknown> = { cmsCheck: checked.verdict };
    if (parts.includes("product")) out.product = await ctx.step("product", async () => (ctx.progress(0.1, L("Création des produits dans Shopify", "Creating the products in Shopify")), pushCatalog(c, cur.spec, (d, t) => ctx.progress(0.1 + (d / t) * 0.35, L(`Produit ${d}/${t} envoyé`, `Product ${d}/${t} sent`)))));
    if (parts.includes("pages")) out.pages = await ctx.step("pages", async () => (ctx.progress(0.5, L("Création des pages", "Creating the pages")), pushPages(c, cur.spec)));
    if (parts.includes("theme")) out.theme = await ctx.step("theme", async () => (ctx.progress(0.8, L("Installation du thème (non publié)", "Installing the theme (unpublished)")), pushTheme(c, projectId, cur.version.id, cur.spec.name)));
    // SEO des fiches : envoyé / accepté / refusé / inconnu, jamais présenté comme vérifié.
    const seo = out.product ? seoSummary((out.product as { seo: Record<string, SeoPushResult> }).seo) : null;
    if (seo) (out as Record<string, unknown>).seoStatus = seo.counts;
    notify(ctx.job.user_id, projectId, L("Envoi vers Shopify terminé", "Sending to Shopify complete"), [Object.keys(out).filter((k) => k !== "seoStatus").join(", "), seo?.text].filter(Boolean).join(" · "), "success");
    return out;
  },
};

export const HANDLER_TYPES = Object.keys(handlers);

// Orchestration (phase 3B) : chaque action du studio devient un petit plan (ses seules étapes), routé, tracé et
// repris sans rien repayer ; le moteur existant reste l'exécuteur (aucune logique dupliquée).
for (const action of Object.keys(ACTION_STEPS)) if (handlers[action]) handlers[action] = orchestrated(action, handlers[action]);
