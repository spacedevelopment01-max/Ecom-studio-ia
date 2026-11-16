import { test, expect } from "vitest";
import { TENUE_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue";
test("l", () => {
  for (const id of ["tn-garanties", "tn-atouts", "tn-comment", "tn-catalogue"]) console.log(id, TENUE_SECTIONS.find((s) => s.id === id)!.constructions.map((c) => c.key).join(","));
  expect(1).toBe(1);
});
