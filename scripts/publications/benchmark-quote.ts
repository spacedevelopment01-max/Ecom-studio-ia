/** Defaults-only quote: NO provider request and NO assertion about the deployment's configuration. */
import fs from "node:fs";
import path from "node:path";
const dir = process.env.DATA_DIR;
if (
  !dir ||
  !path.isAbsolute(dir) ||
  !path.basename(dir).startsWith("ecs-publication-quote-")
)
  throw new Error(
    "DATA_DIR ecs-publication-quote-* requis avant tout accès applicatif",
  );
globalThis.fetch = async () => {
  throw new Error("Aucun réseau autorisé pour le devis indicatif");
};
const { usagePrimary, usageExplicit } =
  await import("../../src/lib/ai/media-routing");
const { routeFor, priceFor, usdToEur } =
  await import("../../src/lib/ai/config");
const { estimateTaskMicro } = await import("../../src/lib/ai/estimate");
const { getJsonSetting } = await import("../../src/lib/settings");
const image = usagePrimary("social_image"),
  layout = usagePrimary("text_layout");
const pricing = (r: { provider: string; model: string }) => ({
  provider: r.provider,
  model: r.model,
  rate: priceFor(r.provider, r.model) ?? null,
});
const markup = getJsonSetting<number>("billing.markup", 1),
  fx = usdToEur();
const perImage = (r: { provider: string; model: string }) => {
  const p = priceFor(r.provider, r.model);
  if (!p) return null;
  const usd =
    p.unit === "image"
      ? p.perImage
      : p.unit === "tokens"
        ? (4000 * p.inputPerM +
            3000 * (p.imageInputPerM ?? p.inputPerM) +
            6300 * (p.imageOutputPerM ?? p.outputPerM)) /
          1e6
        : null;
  return usd == null ? null : Math.round(usd * fx * markup * 1e6);
};
const concept = estimateTaskMicro("copywriting", {
  input: 18000,
  output: 2000,
});
const control = estimateTaskMicro("quality_control", {
  input: 24000,
  output: 2000,
});
const generated = perImage(image),
  textLayout = perImage(layout);
const result = {
  at: new Date().toISOString(),
  kind: "INDICATIVE_REPOSITORY_DEFAULTS_NOT_APPROVED",
  actualProviderCalls: 0,
  actualProviderCostMicro: 0,
  deploymentConfiguration:
    "Unavailable in this workspace: no saved provider keys or ai_calls in the inspected runtime database. These are code defaults, not observed served models.",
  currency: "EUR",
  assumptions: {
    fxUsdToEur: fx,
    markup,
    conceptTokens: { input: 18000, output: 2000 },
    controlTokens: { input: 24000, output: 2000 },
    imageCount: 1,
    referenceCount:
      "subject and logo when present; edit may require a third reference",
  },
  declared: {
    image: pricing(image),
    layout: pricing(layout),
    layoutEnabledByDefault: usageExplicit("text_layout"),
    concept: pricing(routeFor("copywriting")),
    control: pricing(routeFor("quality_control")),
  },
  stepsMicro: { concept, control, image: generated, layout: textLayout },
  oneStepProbableMicro:
    generated == null ? null : concept + generated + control,
  twoStepProbableMicro:
    generated == null || textLayout == null
      ? null
      : concept + generated + textLayout + 2 * control,
  boundedThreeAttemptsIndicativeMicro:
    generated == null ? null : concept + 3 * (generated + control),
  approval:
    "No real call is approved by this file. Re-read actual configured routes, confirmed rates and remaining budget in the provider-configured environment; obtain targeted benchmark approval. Preserve 40% monthly HT / 50% recharge HT and the existing shared test cap; no matrix or new provider/key.",
};
const out = process.argv[2];
if (!out) throw new Error("Chemin de sortie requis");
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(
  "Devis indicatif calculé depuis les valeurs par défaut, aucun appel fournisseur.",
);
