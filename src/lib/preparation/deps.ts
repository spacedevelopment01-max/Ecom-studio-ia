/** Adaptateurs vers les moteurs réels du studio. Les dépendances injectées n'existent qu'au niveau des tests. */
import { exactInstructions } from "./instructions";
import { inspectBrief } from "./inspect";
import { aiActiveFor, assertAiAllowed } from "../ai/access";
import { llmConfigured } from "../ai/llm";
import { aiBrandChecked } from "../engine/brand-check";
import { brandFromAi } from "../ai/tasks";
import { localBrand } from "../engine/local";
import { runContentEngineV2 } from "../seo-v2/engine";
import { localOnlyDeps } from "../seo-v2/deps";
import { localCopy } from "../engine/local-copy";
import { runImageEngineV2 } from "../image-v2/engine";
import { runLogoEngineV2 } from "../logo-v2/engine";
import { isAutoUsable } from "../quality/usable";
import { getAsset } from "../library";
import type { JobContext } from "../jobs";
import type { Project } from "../projects";
import type { Brief, Research, Identity, Contents, VisualSlot } from "./types";
import { researchProject } from "./research";
import { analyzeResearch } from "./research-ai";
import { sitePlan } from "./plan";
import { stateOf } from "./store";
import { sitePages } from "../seo-v2/pages";
export type Dependencies = {
  simulation?: boolean;
  inspect: (
    p: Project,
    b: Brief,
    ctx: JobContext,
    paid: boolean,
  ) => Promise<Brief>;
  research: (
    p: Project,
    b: Brief,
    ctx: JobContext,
    paid: boolean,
  ) => Promise<Research>;
  identity: (p: Project, ctx: JobContext, paid: boolean) => Promise<Identity>;
  contents: (
    p: Project,
    ctx: JobContext,
    paid: boolean,
    options?: { previous?: Contents; pageKey?: string; correction?: string },
  ) => Promise<Contents>;
  logos: (p: Project, ctx: JobContext, cap: number) => Promise<string[]>;
  image: (
    p: Project,
    ctx: JobContext,
    slot: VisualSlot,
    refs: string[],
    cap: number,
  ) => Promise<string>;
};
export const realDependencies: Dependencies = {
  inspect: inspectBrief,
  async research(p, b, ctx, paid) {
    const r = await researchProject(p, b);
    return paid ? analyzeResearch(p, ctx, r) : r;
  },
  async identity(p, ctx, paid) {
    const provided = stateOf(p.id)?.stages.brief?.data.input.brandName;
    let brand = localBrand(p.product, provided || p.brand?.name, p).brand;
    brand.positioning = p.strategy?.angles[0]?.idea || brand.positioning;
    brand.audience = p.strategy?.audience[0]?.label || brand.audience;
    if (paid) {
      assertAiAllowed(p.userId, p.id);
      if (!llmConfigured())
        throw new Error(
          "Fournisseur de textes indisponible. Aucun résultat IA remplacé silencieusement.",
        );
      const r = await ctx.step("identity-ai", () =>
        aiBrandChecked(
          {
            userId: p.userId,
            projectId: p.id,
            jobId: ctx.job.id,
            usageKey: `${ctx.job.id}:identity`,
          },
          {
            ...p,
            brand: provided
              ? { ...brand, name: provided, validated: ["name"] }
              : p.brand,
          },
          [exactInstructions(p.id), ctx.payload.correction || ""].join("\n"),
        ),
      );
      brand = brandFromAi(
        r,
        { concept: r.logo.concept, status: "proposed" },
        brand.palette,
      ).brand;
    }
    if (provided) brand = { ...brand, name: provided, nameStatus: "provided" };
    return {
      proposal: {
        ...brand,
        logo: { concept: "Logo à choisir", status: "proposed" },
        validated: [],
      },
      identityConfirmed: false,
      logoCandidates: [],
      legalAvailability: "not_checked",
      provenance: paid ? "provider" : "local",
    };
  },
  async contents(p, ctx, paid, options) {
    const plan = sitePlan(p);
    for (const page of plan.pages)
      page.docKey = options?.previous?.pages.find(
        (x) => x.key === page.key,
      )?.docKey;
    const documents: Contents["documents"] = options?.pageKey
      ? (options.previous?.documents.filter(
          (d) => d.doc.page.key !== options.pageKey,
        ) ?? [])
      : [];
    const notes: string[] = [];
    if (paid) {
      assertAiAllowed(p.userId, p.id);
      if (!llmConfigured())
        throw new Error("Fournisseur de textes indisponible.");
    }
    for (const page of plan.pages.filter(
      (pg) =>
        pg.kind !== "contact" &&
        (!options?.pageKey || pg.key === options.pageKey),
    )) {
      const type =
        page.kind === "home"
          ? "home_page"
          : page.kind === "product"
            ? "product_page"
            : page.kind === "service"
              ? "service_page"
              : "brand_page";
      const target = sitePages(p).find(
        (x) =>
          x.kind === page.kind &&
          (page.kind === "home" ||
            page.kind === "brand" ||
            x.title === page.title),
      );
      const r = await ctx.step(`content:${page.key}`, () =>
        runContentEngineV2(
          ctx,
          p.id,
          {
            type,
            target: {
              page: {
                key: page.key,
                title: page.title,
                url: null,
                kind:
                  page.kind === "brand"
                    ? "brand"
                    : page.kind === "home"
                      ? "home"
                      : page.kind === "service"
                        ? "service"
                        : "product",
                status: "planned",
              },
              ...(page.kind === "service"
                ? { serviceIndex: Number(page.key.split(":")[1]) }
                : {}),
            },
            pageKey: target?.key,
            request: `Page ${page.title}. ${page.goal}. Angle validé : ${p.strategy?.angles.map((a) => a.idea).join(" ")}. Consignes exactes du client (données, jamais une preuve de promesse) : ${exactInstructions(p.id)}. ${options?.correction ? `Correction ciblée : ${options.correction}` : ""}`,
            force: !!options?.correction,
            maxCostEur: 0.6,
          },
          paid ? undefined : localOnlyDeps(),
        ),
      );
      if (paid && r.by !== "ai")
        throw new Error(
          "La rédaction IA n’a pas abouti. Le brouillon local reste enregistré et n’est pas présenté comme un résultat IA.",
        );
      if (!r.doc || !r.docKey)
        throw new Error(
          `Contenu refusé ou absent pour ${page.title}. Corrigez les informations puis régénérez cette étape.`,
        );
      page.docKey = r.docKey;
      documents.push({ docKey: r.docKey, doc: r.doc, verdict: r.verdict });
      notes.push(...r.notes);
    }
    // Kit de liaison du moteur existant, puis superposition des documents de pages (pas de thème construit).
    const copy = localCopy(p.product, p.brand!, p);
    return {
      copy,
      documents,
      ...plan,
      notes: [...new Set(notes)],
      provenance: paid ? "provider" : "local",
    };
  },
  async logos(p, ctx, cap) {
    assertAiAllowed(p.userId, p.id);
    const r = await runLogoEngineV2(ctx, p.id, {
      capMicro: cap,
      instructions: [
        exactInstructions(p.id),
        ctx.payload.correction || "",
      ].join("\n"),
    });
    return r.shown
      .filter((a) => a.verdict === "FINAL" && a.assetId)
      .map((a) => a.assetId!);
  },
  async image(p, ctx, slot, refs, cap) {
    assertAiAllowed(p.userId, p.id);
    const r = await runImageEngineV2(ctx, p.id, {
      kind:
        p.business === "services"
          ? "trade_photo"
          : slot.key === "home:hero"
            ? "lifestyle"
            : "packshot",
      support: "site",
      aspect: slot.key === "home:hero" ? "16:9" : "4:5",
      topic: slot.purpose,
      instructions: exactInstructions(p.id),
      slot: slot.key,
      references: refs,
      peopleAllowed: slot.peopleConsent === "this_slot",
      noStock: true,
      allowGenerate: true,
      count: 1,
      maxCostEur: cap / 1e6,
    });
    const out = r.outcomes.find((o) => o.assetId && o.verdict === "FINAL");
    const a = out?.assetId ? getAsset(out.assetId) : null;
    if (!a || !isAutoUsable(a) || r.stoppedByCostCap)
      throw new Error(
        "Aucun visuel final contrôlé disponible. Les essais restent conservés ; vérifiez le fournisseur, le budget et le résultat avant une reprise.",
      );
    return a.id;
  },
};
