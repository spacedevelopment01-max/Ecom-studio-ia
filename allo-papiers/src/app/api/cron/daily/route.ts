import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { safeEqualHex, sha256 } from "@/lib/crypto";
import { runMaintenance, sendDueReminders } from "@/lib/reminders";

export const maxDuration = 300;

/** Tâche quotidienne (Vercel Cron) : rappels du jour, purge des documents expirés, nettoyage. */
export async function GET(req: Request) {
  const secret = env.cronSecret;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqualHex(sha256(auth), sha256(`Bearer ${secret}`))) {
    return NextResponse.json({ error: "non_autorise" }, { status: 401 });
  }
  const reminders = await sendDueReminders();
  const maintenance = await runMaintenance();
  return NextResponse.json({ ok: true, reminders, maintenance });
}
