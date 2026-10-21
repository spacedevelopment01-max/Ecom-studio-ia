/** Strategy provenance for one execution. A concurrent activation never relabels acquired content. */
import { AsyncLocalStorage } from 'node:async_hooks';
import { activeStrategy, recordStrategyContent, strategyContext, strategyContextFor } from './marketing-strategy';

type Selection = NonNullable<ReturnType<typeof activeStrategy>>;
export type StrategyStamp = Pick<Selection, 'id' | 'version' | 'angleId' | 'inputDigest'>;
const scope = new AsyncLocalStorage<{ projectId: string; selection: Selection | null; context: string }>();
export function withStrategyScope<T>(projectId: string, fn: () => T, snapshotOverride?: Selection | null): T {
  const selected = scope.getStore();
  if (snapshotOverride === undefined && selected?.projectId === projectId) return fn();
  const selection = snapshotOverride === undefined ? activeStrategy(projectId) : snapshotOverride;
  return scope.run({ projectId, selection, context: strategyContextFor(selection) }, fn);
}
export function strategySelection(projectId: string) {
  const selected = scope.getStore();
  return selected?.projectId === projectId ? selected.selection : activeStrategy(projectId);
}
export function strategyStamp(projectId: string): StrategyStamp | null {
  const s = strategySelection(projectId);
  return s ? { id: s.id, version: s.version, angleId: s.angleId, inputDigest: s.inputDigest } : null;
}
export function selectedStrategyContext(projectId: string) {
  const selected = scope.getStore();
  return selected?.projectId === projectId ? selected.context : strategyContext(projectId);
}
/** Unknown/restored/manual content must not be silently certified against today's strategy. */
export function strategyContent(projectId: string, module: string, contentId: string, options: { stamp?: StrategyStamp | null; protected?: boolean; published?: boolean; scheduled?: boolean } = {}) {
  const stamp = options.stamp === undefined ? strategyStamp(projectId) : options.stamp;
  return recordStrategyContent(projectId, module, contentId, { strategy: stamp, protected: !!options.protected, published: !!options.published, scheduled: !!options.scheduled });
}
