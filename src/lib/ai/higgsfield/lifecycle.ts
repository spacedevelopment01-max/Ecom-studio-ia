/** Resumable polling. Submission has exactly one attempt; existing receipts only poll.
 * A lost submission response stays uncertain; no automatic paid retry, even with idempotency support. */
import { api, HiggsfieldHttpError, type Transport } from "./http";
export type Receipt = {
  requestId: string;
  model: string;
  body: Record<string, unknown>;
  quoteMicro: number;
  quotedUsd: number;
  fx: { usdToEur: number; date: string; source: string; retrievedAt: number };
  revision: string;
  seconds: number;
};
export const polling = { initialMs: 2000, maxMs: 10000, maxPolls: 180 };
export async function submit(
  model: string,
  body: Record<string, unknown>,
  key: string,
  transport?: Transport,
) {
  const j = await api(`/${model}`, body, transport, { "Idempotency-Key": key });
  if (typeof j.request_id !== "string" || !/^[-\w]{1,100}$/.test(j.request_id))
    throw Error("HIGGSFIELD_REQUEST_RECEIPT_INVALID");
  return j.request_id;
}
export class UnchargedTerminal extends Error {}
export async function poll(
  id: string,
  onStatus: (s: string) => void,
  transport?: Transport,
  wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)),
) {
  let delay = polling.initialMs;
  for (let i = 0; i < polling.maxPolls; i++) {
    let j: Record<string, unknown>;
    try {
      j = await api(`/requests/${id}/status`, undefined, transport);
    } catch (e) {
      if (
        e instanceof HiggsfieldHttpError &&
        (e.status === 429 || e.status >= 500)
      ) {
        await wait(
          Math.min(60000, Math.max(delay, (e.retryAfter ?? 0) * 1000)),
        );
        delay = Math.min(polling.maxMs, delay * 1.5);
        continue;
      }
      throw e;
    }
    if (j.request_id !== id) throw Error("HIGGSFIELD_RECEIPT_MISMATCH");
    const status = String(j.status);
    onStatus(status);
    if (["failed", "nsfw", "canceled"].includes(status))
      throw new UnchargedTerminal(
        `HIGGSFIELD_${status.toUpperCase()}_REFUNDED`,
      );
    if (status === "completed") {
      const video = j.video as { url?: unknown } | undefined;
      if (typeof video?.url !== "string")
        throw Error("HIGGSFIELD_OUTPUT_MISSING");
      return video.url;
    }
    if (!["queued", "in_progress"].includes(status))
      throw Error("HIGGSFIELD_STATUS_UNKNOWN");
    await wait(delay);
    delay = Math.min(polling.maxMs, delay * 1.5);
  }
  throw Error("HIGGSFIELD_POLL_TIMEOUT_RESUME_EXISTING");
}
