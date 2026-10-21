import { HttpError } from "./auth";
/** Strategy provenance for one execution. A concurrent activation never relabels acquired content. */
import { AsyncLocalStorage } from 'node:async_hooks';
import { activeStrategy, recordStrategyContent, strategyContext, strategyContextFor, currentStrategyInputDigest, assertStrategyPreparationCurrent } from './marketing-strategy';

type Selection = NonNullable<ReturnType<typeof activeStrategy>>;
export type StrategyStamp = Pick<Selection, 'id' | 'version' | 'angleId' | 'inputDigest'>;
const scope = new AsyncLocalStorage<{ projectId: string; selection: Selection | null; context: string }>();
export function withStrategyScope<T>(projectId: string, fn: () => T, snapshotOverride?: Selection | null): T {
  const selected = scope.getStore();
  if (snapshotOverride === undefined && selected && selected.projectId === projectId) {
    assertStrategyInputsCurrent(projectId);
    return fn();
  }
  const selection = snapshotOverride === undefined ? activeStrategy(projectId) : snapshotOverride;
  if (selection) assertSelectionCurrent(projectId, selection, snapshotOverride !== undefined);
  return scope.run({ projectId, selection, context: strategyContextFor(selection) }, fn);
}
export function strategySelection(projectId: string) {
  if(!projectId)return null; // Pure previews may have no persisted project yet.
  const selected = scope.getStore();
  return selected && selected.projectId === projectId ? selected.selection : activeStrategy(projectId);
}
export function strategyStamp(projectId: string): StrategyStamp | null {
  const s = strategySelection(projectId);
  return s ? { id: s.id, version: s.version, angleId: s.angleId, inputDigest: s.inputDigest } : null;
}
export function selectedStrategyContext(projectId: string) {
  if(!projectId)return "";
  const selected = scope.getStore();
  return selected && selected.projectId === projectId ? selected.context : strategyContext(projectId);
}
/** Unknown/restored/manual content must not be silently certified against today's strategy. */
export function strategyContent(projectId: string, module: string, contentId: string, options: { stamp?: StrategyStamp | null; protected?: boolean; published?: boolean; scheduled?: boolean } = {}) {
  const stamp = options.stamp === undefined ? strategyStamp(projectId) : options.stamp;
  return recordStrategyContent(projectId, module, contentId, { strategy: stamp, protected: !!options.protected, published: !!options.published, scheduled: !!options.scheduled });
}

/** No new paid creation on stale facts/identity or a strategy superseded during execution. */
function assertSelectionCurrent(projectId: string, selected: Selection, prepared = false) {
  if (selected.projectId !== projectId) throw new HttpError(404, "Cette stratégie ne fait pas partie de ce projet.", "strategy_project_mismatch");
  if(selected.id.startsWith("draft-"))assertStrategyPreparationCurrent(projectId,selected.id.slice(6));
  const active = activeStrategy(projectId);
  if (selected.inputDigest !== currentStrategyInputDigest(projectId) || (!prepared && !selected.id.startsWith('draft-') && active?.angleId !== selected.angleId)) {
    throw new HttpError(409, "Les informations du projet ou son angle ont changé. Préparez à nouveau cet angle pour réconcilier les faits et l’identité avant toute nouvelle création. Vos contenus acquis et vos choix sont conservés.", "strategy_inputs_stale");
  }
}
export function assertStrategyInputsCurrent(projectId: string) {
  const selected = strategySelection(projectId);
  if (selected) assertSelectionCurrent(projectId, selected);
}

/** Stable semantic key for reusing an acquired A version after A→B→A, without hiding provenance. */
export function strategyReuseKey(projectId: string) {
  const selected = strategySelection(projectId);
  return selected ? { angleId: selected.angleId, inputDigest: selected.inputDigest } : null;
}
/** Only cache inputs are normalized; persisted documents and Brain traces keep their exact version. */
export function strategyReuseInput(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strategyReuseInput);
  if (!value || typeof value !== 'object') return value;
  const object = value as Record<string, unknown>;
  if (typeof object.angleId === 'string' && typeof object.inputDigest === 'string' && 'activatedAt' in object) {
    return { angleId: object.angleId, inputDigest: object.inputDigest };
  }
  const result = Object.fromEntries(Object.entries(object).map(([key, part]) => [key, strategyReuseInput(part)]));
  if (typeof object.stable === 'string' && typeof object.hash === 'string' && typeof object.scope === 'string') {
    result.stable = object.stable.replace(/<strategie_marketing_active\b[^>]*angle="([^"]+)"[^>]*>/g, '<strategie_marketing_active angle="$1">');
    delete result.hash;
  }
  return result;
}
