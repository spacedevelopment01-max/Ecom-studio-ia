import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { waitAtLeast } from "../scripts/lot9/wait-at-least";

describe("minimum browser proof duration", () => {
  it("keeps the full 17 seconds when the browser timer returns early", async () => {
    let time = 0;
    const requests: number[] = [];
    const elapsed = await waitAtLeast(17000, async (ms) => {
      requests.push(ms);
      time += requests.length === 1 ? ms - 1 : ms;
    }, () => time);
    expect(requests).toEqual([17000, 1]);
    expect(elapsed).toBeGreaterThanOrEqual(17000);
  });
  it("measures a real monotonic minimum", async () => {
    const started = performance.now();
    expect(await waitAtLeast(25, (ms) => new Promise(resolve => setTimeout(resolve, ms))))
      .toBeGreaterThanOrEqual(25);
    expect(performance.now() - started).toBeGreaterThanOrEqual(25);
  });
  it("rejects invalid durations before waiting", async () => {
    for (const duration of [-1, NaN, Infinity]) {
      await expect(waitAtLeast(duration, async () => { throw Error("must not wait"); }))
        .rejects.toThrow(RangeError);
    }
  });
});
