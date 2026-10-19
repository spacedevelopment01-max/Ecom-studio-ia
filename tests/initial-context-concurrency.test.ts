/** Risques concurrents réels, données et fournisseurs injectés isolés ; aucune API payante. */
import { expect, it } from 'vitest';
import { readyInitial, injectedInitial, executeInitial } from './initial-fixtures';
import { loadProject, saveBrand } from '@/lib/projects';
import { all, json } from '@/lib/db';
import { guardInitialImageDeps, initialCreativesView } from '@/lib/social-v2/initial';
import { designPostWithAi } from '@/lib/social-v2/ai-post';

const changed = 'Identité corrigée manuellement pendant le traitement';
function changeIdentity(pid: string) {
  const p = loadProject(pid);
  saveBrand(pid, { ...p.brand!, tagline: changed });
}
function attachedPosts(pid: string) {
  return all<{ media: string }>('SELECT media FROM posts WHERE project_id=?', pid)
    .filter(x => json<string[]>(x.media, []).length > 0);
}
it('changement pendant le rendu : image reçue conservée, aucune relecture payante suivante ni association au post', async () => {
  const f = await readyInitial(), d = injectedInitial();
  const render = d.deps.render;
  let actualVisualReviews = 0;
  const review = d.deps.reviewVisual;
  d.deps.render = async (...args) => {
    const result = await render(...args);
    changeIdentity(f.pid);
    return result;
  };
  d.deps.reviewVisual = async (...args) => { actualVisualReviews++; return review(...args); };
  await expect(executeInitial(f.pid, d.deps)).rejects.toThrow();
  expect.soft(actualVisualReviews).toBe(0);
  expect.soft(attachedPosts(f.pid)).toHaveLength(0);
  expect(d.calls).toHaveLength(1);
  expect(all("SELECT id FROM assets WHERE project_id=? AND role='social'", f.pid)).toHaveLength(1);
  expect(loadProject(f.pid).brand?.tagline).toBe(changed);
});
it('changement pendant la réparation : aucune revue ni nouvelle image sous l’ancien accord, résultat précédent conservé', async () => {
  const f = await readyInitial(), d = injectedInitial();
  const repair = d.deps.repairPlan, review = d.deps.reviewPlan;
  let planReviewsAfterChange = 0, visualReviews = 0, callsAtChange = 0;
  d.deps.reviewVisual = async () => {
    visualReviews++;
    return { accepted: visualReviews > 1, duplicateOf: null, reason: 'Composition refusée dans la simulation, correction ciblée nécessaire.' };
  };
  d.deps.repairPlan = async (...args) => {
    const result = await repair(...args);
    callsAtChange = d.paid.length;
    changeIdentity(f.pid);
    return result;
  };
  d.deps.reviewPlan = async (...args) => {
    if (args[0].brand?.tagline === changed) planReviewsAfterChange++;
    return review(...args);
  };
  await expect(executeInitial(f.pid, d.deps)).rejects.toThrow();
  expect.soft(planReviewsAfterChange).toBe(0);
  expect.soft(d.calls).toHaveLength(1);
  expect.soft(d.paid).toHaveLength(callsAtChange);
  expect.soft(visualReviews).toBe(1);
  expect.soft(attachedPosts(f.pid)).toHaveLength(0);
  expect(all("SELECT id FROM assets WHERE project_id=? AND role='social'", f.pid).length).toBeGreaterThanOrEqual(1);
  expect(loadProject(f.pid).brand?.tagline).toBe(changed);
});
it('le vrai moteur d’image contrôle le contexte entre le générateur asynchrone et sa relecture payante', async () => {
  const f = await readyInitial(), d = injectedInitial();
  const hash = initialCreativesView(f.pid)!.hash;
  const generate = d.ai.generate, review = d.ai.review;
  let nativeReviews = 0;
  d.ai.generate = async (...args) => {
    const result = await generate(...args);
    changeIdentity(f.pid);
    return result;
  };
  d.ai.review = async (...args) => { nativeReviews++; return review(...args); };
  const guarded = guardInitialImageDeps(d.ai, () => {
    if (initialCreativesView(f.pid)?.hash !== hash) throw new Error('Contexte changé après génération : aucun autre appel autorisé.');
  });
  d.deps.render = (p, post, aspect, _cap, _ctx, attemptLimit) => designPostWithAi(p, post, {
    as: 'post', aspect, reference: f.input.photoIds[0], maxCostEur: 1, maxAttempts: attemptLimit,
  }, guarded);
  await expect(executeInitial(f.pid, d.deps)).rejects.toThrow();
  expect(nativeReviews).toBe(0);
  expect(d.paid).toHaveLength(2); // Concept puis image ; aucune relecture fournisseur après changement.
  expect(attachedPosts(f.pid)).toHaveLength(0);
  expect(loadProject(f.pid).brand?.tagline).toBe(changed);
});
