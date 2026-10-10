import fs from "node:fs";
import { one, all } from "@/lib/db";
import { runForUser } from "@/lib/ai/access";
import { runWithLang } from "@/lib/i18n-server";
import { loadProject } from "@/lib/projects";
import { brandDiscovery } from "@/lib/logo-v2/discovery";
import { realLogoV2Ai } from "@/lib/logo-v2/ai";
const u = one<{ id: string }>("SELECT id FROM users WHERE email = 'test-logo-reel@demo.fr'")!;
const pid = one<{ id: string }>("SELECT id FROM projects WHERE user_id = ?", u.id)!.id;
const t0 = Date.now();
await runWithLang({ ui: "fr", content: "fr" }, () => runForUser(u.id, async () => {
  const brief = brandDiscovery(loadProject(pid));
  try {
    const d = await realLogoV2Ai(null, { userId: u.id, projectId: pid }).territories(brief, 5, []);
    fs.writeFileSync(process.argv[2], JSON.stringify(d, null, 2));
    console.log("DIRECTIONS", d.length, Math.round((Date.now() - t0) / 1000), "s");
    for (const x of d) console.log("-", x.name, "|", x.style, "|", x.markType, "|", (x as any).colors, "\n  brief:", ((x as any).imageBrief ?? ""));
  } catch (e: any) { console.log("ERREUR", e?.name, e?.message); }
}));
console.log(all("SELECT task, provider, requested_model, served_model, status, input_tokens, output_tokens, cost, latency_ms, http_attempts, stop_reason FROM ai_calls WHERE created_at > ?", t0));
console.log(all("SELECT status, amount, actual FROM ai_reservations WHERE created_at > ?", t0));
