import { performance } from "node:perf_hooks";

/** Wait for a minimum monotonic duration, including when a timer returns early. */
export async function waitAtLeast(
  milliseconds: number,
  wait: (milliseconds: number) => Promise<unknown>,
  clock: () => number = () => performance.now(),
): Promise<number> {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError("Invalid minimum duration");
  const started = clock();
  let elapsed = clock() - started;
  while (elapsed < milliseconds) {
    await wait(Math.max(1, Math.ceil(milliseconds - elapsed)));
    elapsed = clock() - started;
  }
  return elapsed;
}
