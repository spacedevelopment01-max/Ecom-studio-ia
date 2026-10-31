/** Étude HORS PRODUCTION #209 : scénarios et fournisseurs simulés, aucun SDK ni accès à la base. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export type Tier = 'light' | 'standard' | 'strong';
export type Role = 'principal' | 'strategy' | 'copy' | 'site' | 'media' | 'quality';
export type Step = { role: Role; tier: Tier; input: number; output: number; maxOutput: number; latencyMs: number };
type Rates = Record<Tier, { inputPerM: number; outputPerM: number }>;
export type PriceSnapshot = { rates: Rates; perImageUsd: number; sources: { file: string; sha256: string }[] };
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** Lecture d'objets littéraux par AST, sans exécuter config.ts, settings, DB ou fournisseur. */
function objectLiteral(source: ts.SourceFile, name: string): ts.ObjectLiteralExpression {
  for (const statement of source.statements) if (ts.isVariableStatement(statement)) {
    for (const d of statement.declarationList.declarations) if (d.name.getText(source) === name && d.initializer && ts.isObjectLiteralExpression(d.initializer)) return d.initializer;
  }
  throw new Error(`static_object_missing:${name}`);
}
function members(o: ts.ObjectLiteralExpression, source: ts.SourceFile) {
  return Object.fromEntries(o.properties.filter(ts.isPropertyAssignment).map(p => [ts.isStringLiteral(p.name) ? p.name.text : p.name.getText(source), p.initializer]));
}
function positive(n: ts.Expression | undefined): number {
  if (!n || !ts.isNumericLiteral(n) || !Number.isFinite(Number(n.text)) || Number(n.text) <= 0) throw new Error('static_positive_rate_required');
  return Number(n.text);
}
export function readRepositoryDefaults(root: string): PriceSnapshot {
  const names = ['src/lib/orchestrator/policy.ts', 'src/lib/ai/config.ts', 'src/lib/ai/media-models.ts'];
  const texts = names.map(n => fs.readFileSync(path.join(root, n), 'utf8'));
  const ast = texts.map((s, i) => ts.createSourceFile(names[i], s, ts.ScriptTarget.Latest, true));
  const tiers = members(objectLiteral(ast[0], 'TEXT_MODEL_BY_TIER'), ast[0]);
  const prices = members(objectLiteral(ast[1], 'DEFAULT_PRICES'), ast[1]);
  const rates = {} as Rates;
  for (const tier of ['light', 'standard', 'strong'] as const) {
    const model = tiers[tier];
    if (!model || !ts.isStringLiteral(model)) throw new Error('static_tier_missing');
    const matches = Object.entries(prices).filter(([k]) => k.endsWith(`:${model.text}`));
    if (matches.length !== 1 || !ts.isObjectLiteralExpression(matches[0][1])) throw new Error('static_rate_ambiguous');
    const p = members(matches[0][1], ast[1]);
    rates[tier] = { inputPerM: positive(p.inputPerM), outputPerM: positive(p.outputPerM) };
  }
  const images: number[] = [];
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast[2]) === 'QWEN') {
      const id = node.arguments[0], options = node.arguments[4];
      if (id && ts.isStringLiteral(id) && options && ts.isObjectLiteralExpression(options)) {
        const d = members(options, ast[2]).defaultFor;
        if (d && ts.isStringLiteral(d) && d.text === 'primary') {
          const matches = Object.entries(prices).filter(([k]) => k.endsWith(`:${id.text}`));
          if (matches.length !== 1 || !ts.isObjectLiteralExpression(matches[0][1])) throw new Error('static_image_rate_missing');
          images.push(positive(members(matches[0][1], ast[1]).perImage));
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast[2]);
  if (images.length !== 1) throw new Error('static_primary_image_missing');
  return { rates, perImageUsd: images[0], sources: names.map((file, i) => ({ file, sha256: sha(texts[i]) })) };
}

export type Brief = {
  account: string; project: string; revision: number;
  originalRequest: string; constraints: string[]; exactClientText: string[];
  unknowns: string[]; approvedDecisions: string[];
  offer: string; audience: string; brand: string; mediaRefs: string[];
  page: string; researchRefs: string[];
};
const fields: Record<Role, (keyof Brief)[]> = {
  principal: ['offer', 'audience', 'brand', 'page', 'researchRefs'],
  strategy: ['offer', 'audience', 'brand', 'researchRefs'],
  copy: ['offer', 'audience', 'brand', 'page', 'mediaRefs', 'researchRefs'],
  site: ['offer', 'brand', 'page', 'mediaRefs'],
  media: ['offer', 'brand', 'mediaRefs'],
  quality: ['offer', 'audience', 'brand', 'page', 'mediaRefs', 'researchRefs'],
};
/** Projection simulée : les contraintes critiques ne sont JAMAIS tronquées pour rentrer dans le budget. */
export function projectContext(brief: Brief, role: Role, owner: string, project: string, maxChars = 12000) {
  if (brief.account !== owner || brief.project !== project) throw new Error('foreign_context');
  const context: Record<string, unknown> = {
    account: brief.account, project: brief.project, revision: brief.revision,
    originalRequest: brief.originalRequest, constraints: brief.constraints,
    exactClientText: brief.exactClientText, unknowns: brief.unknowns, approvedDecisions: brief.approvedDecisions,
  };
  for (const key of fields[role]) context[key] = brief[key];
  const serialized = JSON.stringify(context);
  if (serialized.length > maxChars) throw new Error('critical_context_over_limit');
  return { context, fingerprint: sha(serialized), characters: serialized.length };
}

export type Variant = { id: 'single' | 'specialists'; steps: Step[]; images: number; mediaRetryAllowance: number };
export type Scenario = { id: string; brief: string; variants: Variant[] };
const step = (role: Role, tier: Tier, input: number, output: number, latencyMs: number): Step => ({ role, tier, input, output, maxOutput: output * 2, latencyMs });
export const scenarios: Scenario[] = [
  { id: 'simple-question', brief: 'Conseiller le client sur les informations utiles pour son offre ; pas une FAQ fixe.', variants: [
    { id: 'single', steps: [step('principal', 'standard', 1600, 400, 1800)], images: 0, mediaRetryAllowance: 0 },
    { id: 'specialists', steps: [step('principal', 'standard', 1100, 200, 1400), step('strategy', 'standard', 1500, 400, 1800), step('principal', 'standard', 1200, 200, 1400)], images: 0, mediaRetryAllowance: 0 },
  ] },
  { id: 'brand-and-site', brief: 'Même marque, textes, composition et contrôle visuel ; médias client déjà acquis.', variants: [
    { id: 'single', steps: [step('principal', 'strong', 9000, 2400, 8500), step('principal', 'strong', 10500, 3500, 10500), step('quality', 'strong', 6500, 900, 4500)], images: 0, mediaRetryAllowance: 0 },
    { id: 'specialists', steps: [step('principal', 'strong', 3600, 800, 3000), step('strategy', 'strong', 4200, 1500, 5500), step('copy', 'standard', 5200, 2400, 6500), step('site', 'strong', 6500, 3000, 9000), step('quality', 'strong', 6500, 900, 4500), step('principal', 'strong', 2000, 400, 2000)], images: 0, mediaRetryAllowance: 0 },
  ] },
  { id: 'site-ads-media', brief: 'Même site, trois annonces et trois images IA ; contrôle inclus, aucune vidéo.', variants: [
    { id: 'single', steps: [step('principal', 'strong', 10000, 4000, 11000), step('principal', 'strong', 10500, 2800, 9000), step('quality', 'strong', 7500, 1200, 6500)], images: 3, mediaRetryAllowance: 1 },
    { id: 'specialists', steps: [step('principal', 'strong', 3600, 800, 3000), step('site', 'strong', 6500, 3000, 9000), step('copy', 'standard', 5200, 2400, 6500), step('media', 'strong', 4500, 1600, 5500), step('quality', 'strong', 7500, 1200, 6500), step('principal', 'strong', 2200, 400, 2000)], images: 3, mediaRetryAllowance: 1 },
  ] },
];

export function measure(variant: Variant, prices: PriceSnapshot) {
  let textUsd = 0, maximumTextUsd = 0;
  for (const s of variant.steps) {
    for (const n of [s.input, s.output, s.maxOutput, s.latencyMs]) if (!Number.isSafeInteger(n) || n <= 0) throw new Error('invalid_step');
    if (s.maxOutput < s.output) throw new Error('invalid_output_cap');
    const p = prices.rates[s.tier];
    if (!p || !Number.isFinite(p.inputPerM) || p.inputPerM <= 0 || !Number.isFinite(p.outputPerM) || p.outputPerM <= 0) throw new Error('price_missing');
    textUsd += (s.input * p.inputPerM + s.output * p.outputPerM) / 1e6;
    maximumTextUsd += (s.input * 1.25 * p.inputPerM + s.maxOutput * p.outputPerM) / 1e6;
  }
  for (const n of [variant.images, variant.mediaRetryAllowance]) if (!Number.isSafeInteger(n) || n < 0) throw new Error('invalid_media_count');
  if (!Number.isFinite(prices.perImageUsd) || prices.perImageUsd <= 0) throw new Error('price_missing');
  // Une seule correction cognitive autorisée dans l'enveloppe d'étude, au pire prix de ses étapes.
  const repairUsd = Math.max(0, ...variant.steps.map(s => (s.input * 1.25 * prices.rates[s.tier].inputPerM + s.maxOutput * prices.rates[s.tier].outputPerM) / 1e6));
  const textCalls = variant.steps.length;
  const calls = textCalls + variant.images;
  const repairCalls = textCalls ? 1 : 0;
  return {
    calls, textCalls, imageCalls: variant.images,
    maxCalls: calls + repairCalls + variant.mediaRetryAllowance,
    inputTokensEstimated: variant.steps.reduce((n, s) => n + s.input, 0),
    outputTokensEstimated: variant.steps.reduce((n, s) => n + s.output, 0),
    tokenScope: 'text_calls_only_image_price_includes_reference_bound',
    expectedUsd: Number((textUsd + variant.images * prices.perImageUsd).toFixed(6)),
    maximumUsd: Number((maximumTextUsd + repairUsd + (variant.images + variant.mediaRetryAllowance) * prices.perImageUsd).toFixed(6)),
    sequentialLatencyMsEstimated: variant.steps.reduce((n, s) => n + s.latencyMs, 0) + variant.images * 20000,
    quality: 'UNMEASURED' as const,
  };
}

export type Candidate = { id: string; cognitive: boolean; mode: 'local' | 'ai'; qualified: boolean; specialistBenefitVerified: boolean; specialist: boolean; maximumMicro: number; maxCalls: number; maxDurationMs: number };
export type Envelope = { availableMicro: number; consentedMicro: number; maxCalls: number; maxDurationMs: number };
/** Banc d'essai du futur contrat, PAS le Router du Studio ni une autorisation de dépenser. */
export function chooseCandidate(candidates: Candidate[], envelope: Envelope) {
  const numbers = [envelope.availableMicro, envelope.consentedMicro, envelope.maxCalls, envelope.maxDurationMs, ...candidates.flatMap(c => [c.maximumMicro, c.maxCalls, c.maxDurationMs])];
  if (numbers.some(n => !Number.isSafeInteger(n) || n < 0)) throw new Error('invalid_envelope');
  const adequate = candidates.filter(c => c.qualified && (!c.cognitive || c.mode === 'ai') && (!c.specialist || c.specialistBenefitVerified));
  const allowed = adequate.filter(c => c.maximumMicro <= Math.min(envelope.availableMicro, envelope.consentedMicro) && c.maxCalls <= envelope.maxCalls && c.maxDurationMs <= envelope.maxDurationMs);
  allowed.sort((a, b) => a.maximumMicro - b.maximumMicro || Number(a.specialist) - Number(b.specialist));
  return allowed[0] ? { status: 'SIMULATED_PLAN', candidate: allowed[0].id } : { status: 'BLOCKED', reason: adequate.length ? 'envelope_insufficient' : 'quality_not_established' };
}

export function study(root: string) {
  const prices = readRepositoryDefaults(root);
  return {
    schema: 'agent209-orchestration-study-1', simulation: true, realProviderCalls: 0, realCost: 0,
    productionWired: false, qualityGainDemonstrated: false,
    pricingBasis: 'repository_defaults_not_live_admin_or_supplier_verified', prices,
    assumptions: { tokens: 'fixture_estimates_not_tokenizer_or_model_usage', latency: 'synthetic_serial_estimate_not_benchmark', maximum: 'input_x1.25_output_x2_plus_one_targeted_text_repair_and_declared_media_retry', noAutomaticRetryOnUncertainResponse: true },
    scenarios: scenarios.map(s => ({ id: s.id, brief: s.brief, variants: s.variants.map(v => ({ id: v.id, roles: v.steps.map(x => x.role), ...measure(v, prices) })) })),
    limitations: ['No quality equivalence or specialist gain proved.', 'Images are fixture output counts, not generated assets; no vision token usage measured.', 'No external research price, CMS installation, tax, FX, markup or invoice verified.', 'Maxima are study bounds; production quotes must use native estimators, wallet reservations and current approved prices.'],
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(study(path.resolve(import.meta.dirname, '..')), null, 2) + '\n');
}
