import { describe, expect, it } from "vitest";
import { cleanUgcScript, ugcIssues } from "@/lib/ugc-rules";
import { product } from "./fixtures";

const beat = (line: string) => ({ line, caption: line, action: "holds the product toward the phone camera" });

describe("vidéos UGC générées par IA", () => {
  it("refuse les faux témoignages d'une personne générée", () => {
    for (const line of ["Je l'utilise tous les matins et franchement j'adore.", "Depuis que je l'ai, ma peau a changé.", "J'ai testé pendant un mois, résultat bluffant.", "Le meilleur sérum du marché, sans hésiter."]) {
      expect(ugcIssues({ beats: [beat(line)] }).length, line).toBeGreaterThan(0);
    }
  });

  it("accepte une présentation honnête et signale les répliques trop longues ou vides", () => {
    expect(ugcIssues({ beats: [beat("Regardez bien ça : voici le Sérum Éclat, je vous montre le flacon de près.")] })).toEqual([]);
    expect(ugcIssues({ beats: [beat("")] })[0]).toMatch(/vide/);
    expect(ugcIssues({ beats: [beat(Array(30).fill("mot").join(" "))] })[0]).toMatch(/trop longue/);
  });

  it("retire les tirets longs et complète le sous-titre", () => {
    const s = cleanUgcScript({ concept: "", persona: "", setting: "", beats: [{ line: "Voici le flacon — regardez la pipette", caption: "", action: " shows it " }] });
    expect(s.beats[0]).toEqual({ line: "Voici le flacon, regardez la pipette", caption: "Voici le flacon, regardez la pipette", action: "shows it" });
  });

  it("le script local n'utilise que les faits confirmés et respecte les règles", async () => {
    const { localUgcScript } = await import("@/lib/engine/ugc");
    const p = { product, brand: { name: "Éclat" } } as any;
    const s = localUgcScript(p, { format: "9:16", beats: 3, presenter: "femme", age: "25-35", setting: "salle-de-bain", tone: "naturel", angle: "presentation", url: "eclat.fr" });
    expect(s.beats).toHaveLength(3);
    expect(s.beats[0].line).toContain("Sérum Éclat");
    expect(s.beats.map((b) => b.line).join(" ")).toContain("30 ml");
    expect(s.beats[2].line).toContain("eclat.fr");
    expect(ugcIssues(s)).toEqual([]);
    expect(s.setting).toMatch(/bathroom/);
  });

  it("découpe les sous-titres longs en deux et cale les temps sur les plans", async () => {
    const { ugcCues, ugcSrt } = await import("@/lib/engine/ugc");
    const cues = ugcCues(["Regardez bien ça : voici le drone, je vous le montre en quelques secondes.", "Le lien est en dessous."], [8, 8]);
    expect(cues).toHaveLength(3);
    expect(cues[2].start).toBeCloseTo(8.2);
    expect(ugcSrt(cues)).toContain("00:00:08,200 --> 00:00:15,850");
  });
});
