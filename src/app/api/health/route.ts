import { one } from "@/lib/db";

export async function GET() {
  const hb = one<{ beat_at: number }>("SELECT MAX(beat_at) beat_at FROM worker_heartbeat");
  const workerOk = !!hb?.beat_at && Date.now() - hb.beat_at < 60_000;
  return Response.json({ ok: true, worker: workerOk ? "actif" : "arrêté", lastBeat: hb?.beat_at ?? null });
}
