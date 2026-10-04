import { describe, expect, it } from "vitest";
import { ugcIssues } from "@/lib/ugc-rules";

const beat = (line: string) => ({ line, caption: line, action: "holds the product toward the phone camera" });

describe("UGC script rules in English", () => {
  it("rejects fake testimonials from an AI-generated presenter", () => {
    for (const line of ["I use it every morning and honestly I love it.", "Since I started, my skin has changed.", "I've tried it for a month, amazing results.", "The best serum on the market, no doubt."]) {
      expect(ugcIssues({ beats: [beat(line)] }, "en").length, line).toBeGreaterThan(0);
    }
  });

  it("accepts an honest presentation and reports empty or overly long lines in the message language", () => {
    expect(ugcIssues({ beats: [beat("Take a look: here is the Glow Serum, let me show you the bottle up close.")] }, "en")).toEqual([]);
    expect(ugcIssues({ beats: [beat("")] }, "en")[0]).toMatch(/empty/);
    expect(ugcIssues({ beats: [beat(Array(30).fill("word").join(" "))] }, "en")[0]).toMatch(/too long/);
    // Script anglais, messages en français (langue de l'interface).
    expect(ugcIssues({ beats: [beat("")] }, "en", "fr")[0]).toMatch(/vide/);
  });

  it("keeps French as the default", () => {
    expect(ugcIssues({ beats: [beat("")] })[0]).toMatch(/vide/);
  });
});
