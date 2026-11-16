import { test } from "vitest";
import { TENUE_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue";
import fs from "node:fs";
test("l", () => {
  const out = TENUE_SECTIONS.map((s) => `${s.id} | ${s.title} | ${s.role}${s.group ? "/" + s.group : ""} | ${s.constructions.map((c) => c.key).join(",")}${s.authentic ? " | AUTH" : ""}${s.data ? " | data" : ""}`).join("\n");
  fs.writeFileSync("/tmp/claude-0/-home-user-Ecom-studio-ia/cdd8e871-2fa8-5553-9230-2342b2efce3a/scratchpad/list.txt", out);
  fs.writeFileSync("/tmp/claude-0/-home-user-Ecom-studio-ia/cdd8e871-2fa8-5553-9230-2342b2efce3a/scratchpad/all.json", JSON.stringify(TENUE_SECTIONS, null, 1));
});
