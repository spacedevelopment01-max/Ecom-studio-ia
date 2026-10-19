/** Catalogue actif et préparation réels, réponses rédactionnelles injectées ; aucune IA réelle ni thème construit. */
import { expect, it } from 'vitest';
import { readyInitial } from './initial-fixtures';
import { simulatedDependencies } from './preparation-fixtures';
import { approve, blockers, chooseRecommendedTheme, stateOf } from '@/lib/preparation/engine';
import { commitState, draft } from '@/lib/preparation/store';
import { rebindRecommendationCategory } from '@/lib/preparation/editorial';
import { recordCategoryChoice, categoryContextHash } from '@/lib/project-handoff/category-store';
import { loadProject } from '@/lib/projects';
import { all, now } from '@/lib/db';
import { JobContext, enqueue } from '@/lib/jobs';
import type { Contents } from '@/lib/preparation/types';
import type { ProjectCategory } from '@/lib/project-handoff/categories';

function category(pid: string, choice: ProjectCategory) {
  const p = loadProject(pid), input = stateOf(pid)!.stages.brief!.data.input;
  recordCategoryChoice(p, input, choice, categoryContextHash(p, input));
}
async function providerContent(pid: string): Promise<Contents> {
  const p = loadProject(pid), ctx = new JobContext(enqueue({ userId: p.userId, projectId: pid, type: 'isolated.content.fixture', payload: {} }));
  const c = await simulatedDependencies.contents(p, ctx, false);
  // L'étiquette provider sert uniquement à exercer les gardes de production ; cette
  // preuve est injectée, et ne prétend démontrer ni appel fournisseur ni qualité réelle.
  c.provenance = 'provider';
  c.execution = { provider: 'simulation', model: 'injected', usageKey: 'isolated-fixture', vision: false, at: now() };
  c.recommendation = rebindRecommendationCategory(p);
  c.editorial = c.pages.map(pg => ({ pageKey: pg.key, sectionKey: pg.sections[0].key, objective: pg.goal, message: pg.title, docKey: c.documents.find(d => d.doc.page.key === pg.key)!.docKey, blockIds: ['h1', 'p', 'detail'], text: pg.goal, mediaSlotKeys: c.slots.filter(s => s.pageKey === pg.key).map(s => s.key), rationale: 'Liaison isolée fournie par le double de test.' }));
  commitState(pid, stateOf(pid)!.revision, s => draft(s, 'content', c));
  return c;
}
it.each([
  [0, 'specialized', null, ['fraise', 'onde']],
  [2, 'ecommerce', 'orbe', []],
  [1, 'services', 'atelier-rive', []],
  [3, 'services', 'atelier-rive', []],
] as const)('cas %i : validation des textes et préparation médias sans fausse installation de référence', async (index, choice, primary, alternatives) => {
  const f = await readyInitial(index); category(f.pid, choice);
  const before = loadProject(f.pid).brand, c = await providerContent(f.pid);
  expect(c.recommendation).toMatchObject({ status: 'reference_pending', engineThemeId: null, recommendedId: '', recommendedReferenceId: primary, alternativesReferenceIds: alternatives });
  expect(() => approve(f.pid, stateOf(f.pid)!.revision, 'content')).not.toThrow();
  const current = stateOf(f.pid)!;
  expect(current.stages.content?.status).toBe('approved');
  expect(current.stages.media?.data.slots.filter(s => s.kind === 'image')).toHaveLength(10);
  expect(current.stages.media?.data.slots.filter(s => s.kind === 'video')).toHaveLength(index % 2 ? 2 : 1);
  expect(loadProject(f.pid).brand).toEqual(before);
  expect(all('SELECT id FROM theme_versions WHERE project_id=?', f.pid)).toEqual([]);
  expect(all('SELECT id FROM ai_calls WHERE project_id=?', f.pid)).toEqual([]);
});
it('une catégorie ambiguë reste bloquée puis se résout localement sans réécriture des documents', async () => {
  const f = await readyInitial(), c = await providerContent(f.pid);
  expect(c.recommendation?.status).toBe('clarification_required');
  const texts = all('SELECT id,doc_json FROM content_documents WHERE project_id=?', f.pid);
  expect(() => approve(f.pid, stateOf(f.pid)!.revision, 'content')).toThrow(/catégorie/);
  category(f.pid, 'ecommerce');
  commitState(f.pid, stateOf(f.pid)!.revision, s => { s.stages.content!.data.recommendation = rebindRecommendationCategory(loadProject(f.pid), s.stages.content!.data.recommendation); });
  expect(() => approve(f.pid, stateOf(f.pid)!.revision, 'content')).not.toThrow();
  expect(all('SELECT id,doc_json FROM content_documents WHERE project_id=?', f.pid)).toEqual(texts);
  expect(all('SELECT id FROM ai_calls WHERE project_id=?', f.pid)).toEqual([]);
});
it('une ancienne éligibilité stockée ne permet pas une référence appartenant à une autre catégorie actuelle', async () => {
  const f = await readyInitial(); category(f.pid, 'ecommerce');
  const c = await providerContent(f.pid);
  expect(c.recommendation?.recommendedReferenceId).toBe('orbe');
  category(f.pid, 'specialized');
  expect(() => approve(f.pid, stateOf(f.pid)!.revision, 'content')).toThrow(/catégorie/);
  expect(stateOf(f.pid)?.stages.content?.status).toBe('draft');
});
it('un ancien thème conservé, même marqué disponible dans le document historique, ne redevient pas sélectionnable', async () => {
  const f = await readyInitial(); category(f.pid, 'ecommerce');
  await providerContent(f.pid);
  commitState(f.pid, stateOf(f.pid)!.revision, s => {
    const r = s.stages.content!.data.recommendation!;
    r.selectedId = 'clinique'; r.recommendedId = 'clinique'; r.status = 'selected';
    r.catalogue = [{ id: 'clinique', name: 'Historique conservé', status: 'available', reason: 'Ancienne proposition' }];
  });
  const before = stateOf(f.pid), brand = loadProject(f.pid).brand;
  expect(() => chooseRecommendedTheme(f.pid, before!.revision, 'clinique')).toThrow(/ancien thème/);
  expect(() => chooseRecommendedTheme(f.pid, before!.revision, 'orbe')).toThrow(/raccordement/);
  expect(stateOf(f.pid)).toEqual(before); expect(loadProject(f.pid).brand).toEqual(brand);
  expect(stateOf(f.pid)?.stages.content?.data.recommendation?.selectedId).toBe('clinique');
});
it('un identifiant de référence ne peut pas se déclarer identifiant installable dans un document', async () => {
  const f = await readyInitial(); category(f.pid, 'ecommerce'); await providerContent(f.pid);
  commitState(f.pid, stateOf(f.pid)!.revision, s => { s.stages.content!.data.recommendation!.engineThemeId = 'orbe'; });
  expect(() => approve(f.pid, stateOf(f.pid)!.revision, 'content')).toThrow(/catégorie/);
});
it('les blocages finaux distinguent données de référence prêtes et ancienne recommandation retirée', async () => {
  const f = await readyInitial(); category(f.pid, 'ecommerce'); await providerContent(f.pid);
  approve(f.pid, stateOf(f.pid)!.revision, 'content');
  commitState(f.pid, stateOf(f.pid)!.revision, s => {
    s.simulation = false;
    s.stages.media!.status = 'approved';
    for (const slot of s.stages.media!.data.slots) slot.required = false;
  });
  expect(blockers(f.pid).some(x => /plan éditorial ou catégorie/.test(x))).toBe(false);
  commitState(f.pid, stateOf(f.pid)!.revision, s => { s.stages.content!.data.recommendation!.status = 'selected'; });
  expect(blockers(f.pid).some(x => /plan éditorial ou catégorie/.test(x))).toBe(true);
});
