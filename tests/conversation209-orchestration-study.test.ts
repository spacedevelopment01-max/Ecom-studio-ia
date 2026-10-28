import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { chooseCandidate, measure, projectContext, readRepositoryDefaults, scenarios, study, type Brief, type Candidate } from '../scripts/agent209-orchestration-study';

const root = path.resolve(import.meta.dirname, '..');
const prices = readRepositoryDefaults(root);
const envelope = { availableMicro: 1000, consentedMicro: 600, maxCalls: 8, maxDurationMs: 90000 };
const candidate = (over: Partial<Candidate> = {}): Candidate => ({ id: 'main-qualified', cognitive: true, mode: 'ai', qualified: true, specialist: false, specialistBenefitVerified: false, maximumMicro: 400, maxCalls: 3, maxDurationMs: 10000, ...over });
const brief: Brief = {
  account: 'account-a', project: 'project-a', revision: 3,
  originalRequest: 'Je répare les instruments fournis par mes clients.',
  constraints: ['Aucun instrument vendu', 'Aucun avis inventé'], exactClientText: ['Chaque instrument a son histoire.'],
  unknowns: ['Tarifs à confirmer'], approvedDecisions: ['Devis puis rendez-vous'],
  offer: 'Réparation', audience: 'Musiciens', brand: 'Atelier fictif', mediaRefs: ['owned-photo'], page: 'prestation', researchRefs: [],
};

describe('Étude #209 — simulations, jamais un routeur de production', () => {
  it('lit les tarifs par défaut sans importer la base et sans exporter des identifiants de modèles', () => {
    expect(prices.rates.strong.inputPerM).toBeGreaterThan(0);
    expect(prices.perImageUsd).toBeGreaterThan(0);
    expect(prices.sources).toHaveLength(3);
    expect(prices.sources.every(s => /^[a-f0-9]{64}$/.test(s.sha256))).toBe(true);
    expect(Object.keys(prices).sort()).toEqual(['perImageUsd', 'rates', 'sources']);
  });
  it('compare les mêmes livrables mono et spécialistes dans les trois scénarios', () => {
    const report = study(root);
    expect(report.scenarios).toHaveLength(3);
    for (const s of report.scenarios) {
      expect(s.variants.map(v => v.id)).toEqual(['single', 'specialists']);
      expect(s.variants[0].imageCalls).toBe(s.variants[1].imageCalls);
      expect(s.variants.every(v => v.quality === 'UNMEASURED')).toBe(true);
    }
    expect(report.realProviderCalls).toBe(0);
    expect(report.productionWired).toBe(false);
    expect(report.qualityGainDemonstrated).toBe(false);
  });
  it('compte chaque spécialiste, la synthèse, les évaluations, les images et toutes les reprises prévues', () => {
    const v = scenarios[2].variants[1], cost = measure(v, prices);
    expect(cost.textCalls).toBe(6);
    expect(cost.imageCalls).toBe(3);
    expect(cost.calls).toBe(9);
    expect(cost.maxCalls).toBe(11);
    expect(cost.maximumUsd).toBeGreaterThan(cost.expectedUsd);
    const withoutImages = measure({ ...v, images: 0, mediaRetryAllowance: 0 }, prices);
    expect(cost.expectedUsd - withoutImages.expectedUsd).toBeCloseTo(3 * prices.perImageUsd, 6);
    expect(cost.maximumUsd - withoutImages.maximumUsd).toBeCloseTo(4 * prices.perImageUsd, 6);
  });
  it('recalcule tous les prix quand le catalogue simulé change', () => {
    const doubled = { ...prices, rates: Object.fromEntries(Object.entries(prices.rates).map(([k, p]) => [k, { inputPerM: p.inputPerM * 2, outputPerM: p.outputPerM * 2 }])) as typeof prices.rates, perImageUsd: prices.perImageUsd * 2 };
    for (const s of scenarios) for (const v of s.variants) expect(measure(v, doubled).maximumUsd).toBeCloseTo(measure(v, prices).maximumUsd * 2, 5);
  });
  it('refuse un tarif inconnu ou un nombre de tokens/media invalide, jamais un coût gratuit par défaut', () => {
    expect(() => measure(scenarios[0].variants[0], { ...prices, rates: { ...prices.rates, standard: { inputPerM: NaN, outputPerM: 1 } } })).toThrow('price_missing');
    expect(() => measure({ ...scenarios[0].variants[0], images: -1 }, prices)).toThrow('invalid_media_count');
    expect(() => measure({ ...scenarios[0].variants[0], steps: [{ ...scenarios[0].variants[0].steps[0], input: 0 }] }, prices)).toThrow('invalid_step');
  });
  it('n’utilise jamais le local pour simuler une décision cognitive sans preuve d’équivalence', () => {
    expect(chooseCandidate([candidate({ mode: 'local', maximumMicro: 0 })], envelope)).toEqual({ status: 'BLOCKED', reason: 'quality_not_established' });
    expect(chooseCandidate([candidate({ mode: 'local', cognitive: false, maximumMicro: 0 })], envelope).status).toBe('SIMULATED_PLAN');
  });
  it('préfère le moins cher des modèles qualifiés, sans accepter un modèle inférieur non qualifié', () => {
    expect(chooseCandidate([candidate({ id: 'cheap-unproven', maximumMicro: 1, qualified: false }), candidate()], envelope).candidate).toBe('main-qualified');
    expect(chooseCandidate([candidate({ id: 'qualified-cheaper', maximumMicro: 200 }), candidate()], envelope).candidate).toBe('qualified-cheaper');
  });
  it('ne suppose pas de gain de qualité pour un spécialiste', () => {
    expect(chooseCandidate([candidate({ specialist: true })], envelope).status).toBe('BLOCKED');
    expect(chooseCandidate([candidate({ specialist: true, specialistBenefitVerified: true })], envelope).status).toBe('SIMULATED_PLAN');
  });
  it('arrête si la qualité suffisante dépasse le budget, sans résultat simplifié', () => {
    expect(chooseCandidate([candidate({ maximumMicro: 601 }), candidate({ id: 'low-quality', maximumMicro: 2, qualified: false })], envelope)).toEqual({ status: 'BLOCKED', reason: 'envelope_insufficient' });
  });
  it('ne crée pas de sous-budget pour un spécialiste et exige le consentement même avec un solde suffisant', () => {
    expect(chooseCandidate([candidate({ specialist: true, specialistBenefitVerified: true, maximumMicro: 1100 })], { ...envelope, consentedMicro: 1500 }).status).toBe('BLOCKED');
    expect(chooseCandidate([candidate()], { ...envelope, consentedMicro: 0 }).status).toBe('BLOCKED');
    expect(chooseCandidate([candidate({ maximumMicro: 600 })], envelope).status).toBe('SIMULATED_PLAN');
  });
  it('borne les appels et la durée, y compris critiques, replis et corrections', () => {
    expect(chooseCandidate([candidate({ maxCalls: 9 })], envelope).status).toBe('BLOCKED');
    expect(chooseCandidate([candidate({ maxDurationMs: 90001 })], envelope).status).toBe('BLOCKED');
    expect(() => chooseCandidate([candidate()], { ...envelope, availableMicro: NaN })).toThrow('invalid_envelope');
  });
  it('transmet les contraintes critiques, les inconnues et les décisions à tous les rôles sans historique entier', () => {
    for (const role of ['principal', 'strategy', 'copy', 'site', 'media', 'quality'] as const) {
      const projected = projectContext(brief, role, brief.account, brief.project);
      expect(projected.context.originalRequest).toBe(brief.originalRequest);
      expect(projected.context.constraints).toEqual(brief.constraints);
      expect(projected.context.exactClientText).toEqual(brief.exactClientText);
      expect(projected.context.unknowns).toEqual(brief.unknowns);
      expect(projected.context.approvedDecisions).toEqual(brief.approvedDecisions);
      expect(projected.context).not.toHaveProperty('history');
      expect(projected.context.revision).toBe(3);
    }
    expect(projectContext(brief, 'media', brief.account, brief.project).context).not.toHaveProperty('researchRefs');
  });
  it('ne partage ni ne met en cache un contexte étranger ; invalide l’empreinte après correction', () => {
    expect(() => projectContext(brief, 'site', 'account-b', brief.project)).toThrow('foreign_context');
    expect(() => projectContext(brief, 'site', brief.account, 'project-b')).toThrow('foreign_context');
    const before = projectContext(brief, 'site', brief.account, brief.project);
    expect(projectContext({ ...brief, revision: 4 }, 'site', brief.account, brief.project).fingerprint).not.toBe(before.fingerprint);
    expect(projectContext({ ...brief, constraints: ['Correction client'] }, 'site', brief.account, brief.project).fingerprint).not.toBe(before.fingerprint);
  });
  it('ne tronque pas les contraintes pour rentrer dans une fenêtre de contexte', () => {
    expect(() => projectContext({ ...brief, constraints: ['x'.repeat(13000)] }, 'site', brief.account, brief.project)).toThrow('critical_context_over_limit');
    expect(() => projectContext(brief, 'site', brief.account, brief.project, 20)).toThrow('critical_context_over_limit');
  });
});
