/** Parcours et atomicité réels ; dessins et défauts fournisseur injectés, aucun appel payant. */
import { expect, it, vi, afterEach } from 'vitest';
const controls = vi.hoisted(() => ({ failBook: false, beforeBook: null as null | ((pid: string) => void), afterBook: null as null | ((pid: string) => void) }));
vi.mock('@/lib/logo-v2/artwork', async original => ({ ...await original<object>(), faithfulSvg: async () => ({ ok: false, reason: 'Vectorisation exclue de ce test isolé.' }) }));
vi.mock('@/lib/engine/brand', async original => {
  const real = await original<typeof import('@/lib/engine/brand')>();
  return { ...real, saveBrandBook: async (...args: Parameters<typeof real.saveBrandBook>) => {
    controls.beforeBook?.(args[0]);
    if (controls.failBook) throw new Error('Interruption simulée avant la nouvelle charte');
    const result = await real.saveBrandBook(...args);
    controls.afterBook?.(args[0]);
    return result;
  } };
});
import { readyInitial } from './initial-fixtures';
import { fixture } from './preparation-fixtures';
import { validatedBrand, syntheticDirections } from './preparation-mission-fixtures';
import { loadProject, saveBrand, remember } from '@/lib/projects';
import { currentSeries, directionSeries, reserveDirectionSeries, updateDirectionSeries, directionSetIssues, directionNamingBrand } from '@/lib/logo-v2/direction-series';
import { selectCompleteDirection, pendingDirection, assertSelectedDirection } from '@/lib/logo-v2/selection';
import { chooseLogoV2 } from '@/lib/logo-v2/choose';
import { buildCandidate } from '@/lib/logo-v2/construct';
import { brandDiscovery } from '@/lib/logo-v2/discovery';
import { all, run, json } from '@/lib/db';
import { stateOf, synchronizeBrandEdit } from '@/lib/preparation/store';
import { blockers, approve, queuePreparation, runPreparation, confirmIdentity } from '@/lib/preparation/engine';
import { simulatedDependencies } from './preparation-fixtures';
import { JobContext, getJob, completeJob } from '@/lib/jobs';
afterEach(() => { controls.failBook = false; controls.beforeBook = null; controls.afterBook = null; });
async function pack(pid: string, key = 'initial', renew = false) {
  const loaded = loadProject(pid), p = { ...loaded, brand: directionNamingBrand(pid) }, made = await syntheticDirections(pid), series = reserveDirectionSeries(pid, key, { renew });
  for (const d of made.directions) {
    const spec = buildCandidate(d.territory, brandDiscovery(p), { family: 'Inter', attempt: 0, symbol: null }).spec;
    run("UPDATE assets SET role='logo-v2',meta=? WHERE id=?", JSON.stringify({ simulation: true, engine: 'logo-v2', gate: { verdict: 'FINAL', checker: 'simulation' }, territory: d.territory, spec, artwork: { expected: { name: p.brand!.name }, textBox: null } }), d.logoId);
  }
  updateDirectionSeries(pid, series.id, s => { s.territories = made.territories; s.directions = made.directions; });
  return currentSeries(pid)!;
}
it.each(['products', 'services'] as const)('choix %s enregistré et rouvert sans remplacer la marque avant validation, kit propre puis état cohérent', async business => {
  const f = await readyInitial(business === 'products' ? 0 : 1), before = loadProject(f.pid).brand!, s = await pack(f.pid);
  const beforeState = stateOf(f.pid), selected = s.directions[1];
  const files = all('SELECT id FROM assets WHERE project_id=?', f.pid);
  selectCompleteDirection(f.pid, selected.logoId);
  expect(JSON.parse(JSON.stringify(pendingDirection(f.pid)))).toMatchObject({ logoId: selected.logoId, status: 'selected' });
  expect(loadProject(f.pid).brand).toEqual(before);
  expect(stateOf(f.pid)).toEqual(beforeState);
  expect(all('SELECT id FROM assets WHERE project_id=?', f.pid)).toEqual(files);
  controls.beforeBook = pid => expect(loadProject(pid).brand).toEqual(before);
  const applied = await chooseLogoV2(null, f.pid, selected.logoId);
  const active = loadProject(f.pid).brand!;
  expect(active).toMatchObject({ name: before.name, tagline: selected.identity.signature, palette: selected.identity.palette, fonts: selected.identity.fonts, tone: selected.identity.tone });
  expect(active.artIdentity?.colorRoles).toEqual(selected.identity.colorRoles);
  expect(active.artIdentity?.mood).toBe(selected.identity.mood);
  expect(stateOf(f.pid)?.stages.brand?.status).toBe('approved');
  expect(stateOf(f.pid)?.stages.brand?.data.proposal).toEqual(active);
  expect(pendingDirection(f.pid)?.status).toBe('applied');
  for (const role of ['logo-light', 'logo-mono', 'logo-white', 'logo-mark', 'favicon', 'brand-board', 'brand-guide', 'brand-book']) expect(all('SELECT id FROM assets WHERE project_id=? AND role=? AND source_asset_id=?', f.pid, role, applied.main)).toHaveLength(1);
  const count = all('SELECT id FROM assets WHERE project_id=?', f.pid).length;
  expect(await chooseLogoV2(null, f.pid, selected.logoId)).toMatchObject({ reused: true, main: applied.main });
  expect(all('SELECT id FROM assets WHERE project_id=?', f.pid)).toHaveLength(count);
  expect(all('SELECT id FROM ai_calls WHERE project_id=?', f.pid)).toEqual([]);
  expect(all('SELECT id FROM theme_versions WHERE project_id=?', f.pid)).toEqual([]);
}, 60000);
it('une ancienne charte ne masque pas un échec de la nouvelle ; identité active, versions et textes manuels conservés', async () => {
  const f = await readyInitial(), s = await pack(f.pid);
  await chooseLogoV2(null, f.pid, s.directions[0].logoId);
  const before = loadProject(f.pid).brand!, state = stateOf(f.pid);
  remember(f.pid, { kind: 'artifact', key: 'test.manual', value: 'Texte retouché à conserver mot pour mot.', source: 'user' });
  const oldBooks = all('SELECT id FROM assets WHERE project_id=? AND role=\'brand-book\'', f.pid);
  expect(oldBooks.length).toBe(1);
  controls.failBook = true;
  await expect(chooseLogoV2(null, f.pid, s.directions[1].logoId)).rejects.toThrow(/Interruption simulée/);
  expect(loadProject(f.pid).brand).toEqual(before);
  expect(stateOf(f.pid)).toEqual(state);
  expect(all('SELECT id FROM assets WHERE project_id=? AND role=\'brand-book\'', f.pid)).toEqual(oldBooks);
  expect(all<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND key='test.manual'", f.pid)[0].value).toBe('Texte retouché à conserver mot pour mot.');
  controls.failBook = false;
  await chooseLogoV2(null, f.pid, s.directions[1].logoId);
  expect(loadProject(f.pid).brand?.artIdentity?.directionId).toBe(s.directions[1].id);
  expect(all("SELECT id FROM memory WHERE project_id=? AND key LIKE 'brand.before-direction.%'", f.pid).length).toBeGreaterThanOrEqual(2);
}, 60000);
it('une retouche concurrente pendant les déclinaisons est conservée et bloque l’activation', async () => {
  const f = await fixture(); validatedBrand(f.pid, f.input); const s = await pack(f.pid), before = loadProject(f.pid).brand!;
  controls.afterBook = pid => saveBrand(pid, { ...loadProject(pid).brand!, story: 'Mon texte manuel pendant le traitement.' });
  await expect(chooseLogoV2(null, f.pid, s.directions[2].logoId)).rejects.toThrow(/retouchée pendant/);
  expect(loadProject(f.pid).brand).toEqual({ ...before, story: 'Mon texte manuel pendant le traitement.' });
  expect(currentSeries(f.pid)?.selectedId).toBeUndefined();
}, 60000);
it('un renouvellement et sa série restent séparés de l’identité active et de ses validations', async () => {
  const f = await readyInitial(); run("UPDATE subscriptions SET plan='vendre' WHERE owner_user_id=?", f.uid);
  const s = await pack(f.pid); await chooseLogoV2(null, f.pid, s.directions[0].logoId);
  const active = loadProject(f.pid).brand!, beforeStatus = stateOf(f.pid)!.stages.brand!.status;
  const second = await pack(f.pid, 'renew', true);
  expect(directionSeries(f.pid)).toHaveLength(2);
  expect(loadProject(f.pid).brand).toEqual(active); expect(stateOf(f.pid)!.stages.brand!.status).toBe(beforeStatus);
  selectCompleteDirection(f.pid, second.directions[2].logoId);
  expect(loadProject(f.pid).brand).toEqual(active);
  saveBrand(f.pid, { ...active, story: 'Retouche après le choix.' });
  expect(() => assertSelectedDirection(f.pid, second.directions[2].logoId)).toThrow(/modifiée depuis/);
}, 60000);
it('confirmer un nouveau nom proposé prépare la nouvelle série sans remplacer l’identité déjà active', async () => {
  const f = await readyInitial(); run("UPDATE subscriptions SET plan='vendre' WHERE owner_user_id=?", f.uid);
  const first = await pack(f.pid); await chooseLogoV2(null, f.pid, first.directions[0].logoId);
  const active = loadProject(f.pid).brand!;
  confirmIdentity(f.pid, stateOf(f.pid)!.revision, { name: 'Une autre identité confirmée', tagline: active.tagline, palette: active.palette, fonts: active.fonts });
  expect(loadProject(f.pid).brand).toEqual(active);
  expect(stateOf(f.pid)?.stages.brand?.data.proposal.name).toBe('Une autre identité confirmée');
  const next = await pack(f.pid, 'new-name', true);
  expect(next.name).toBe('Une autre identité confirmée');
  expect(loadProject(f.pid).brand).toEqual(active);
  selectCompleteDirection(f.pid, next.directions[1].logoId);
  expect(loadProject(f.pid).brand).toEqual(active);
  await chooseLogoV2(null, f.pid, next.directions[1].logoId);
  expect(loadProject(f.pid).brand?.name).toBe('Une autre identité confirmée');
  expect(loadProject(f.pid).brand?.artIdentity?.seriesId).toBe(next.id);
  expect(stateOf(f.pid)?.stages.brand?.status).toBe('approved');
}, 60000);
it('la retouche de marque se retrouve dans le parcours sans écraser ses documents ; la revalidation ne rend pas la suite faussement approuvée', async () => {
  const f = await readyInitial(), before = loadProject(f.pid).brand!, changed = { ...before, tone: { ...before.tone, voice: 'Ton précis choisi manuellement' } };
  saveBrand(f.pid, changed); synchronizeBrandEdit(f.pid, changed);
  const s = stateOf(f.pid)!;
  expect(s.stages.brand?.status).toBe('draft'); expect(s.stages.brand?.data.proposal).toEqual(changed);
  approve(f.pid, s.revision, 'brand', { logoId: s.stages.brand!.data.selectedLogo });
  expect(stateOf(f.pid)?.stages.brand?.status).toBe('approved');
  expect(blockers(f.pid).some(x => /contenus|visuels/.test(x))).toBe(true);
});
it('trois palettes ne suffisent pas à trois ensembles ; absence d’un dessin final relue comme série partielle', async () => {
  const f = await fixture(); validatedBrand(f.pid, f.input); const s = await pack(f.pid);
  const same = s.territories.map((t, i) => ({ ...t, identity: { ...s.directions[0].identity, palette: s.directions[i].identity.palette } }));
  expect(directionSetIssues(same).join(' ')).toMatch(/changer les couleurs/);
  run("UPDATE assets SET status='rejected' WHERE id=?", s.directions[1].logoId);
  expect(currentSeries(f.pid)?.status).toBe('partial');
  expect(() => selectCompleteDirection(f.pid, s.directions[0].logoId)).toThrow(/incomplète/);
});
it('redemander des propositions dans le parcours conserve l’identité déjà approuvée', async () => {
  const f = await readyInitial(); const s = await pack(f.pid); await chooseLogoV2(null, f.pid, s.directions[0].logoId);
  const active = loadProject(f.pid).brand!, q = queuePreparation(f.pid, stateOf(f.pid)!.revision, 'brand', 'logo', { paid: false, capMicro: 0 });
  run("UPDATE jobs SET status='running' WHERE id=?", q.job!.id);
  const out = await runPreparation(new JobContext(getJob(q.job!.id)!), simulatedDependencies); completeJob(q.job!.id, out);
  expect(loadProject(f.pid).brand).toEqual(active);
  expect(stateOf(f.pid)?.stages.brand?.status).toBe('approved');
}, 60000);
