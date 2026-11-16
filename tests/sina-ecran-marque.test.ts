import { describe, it, expect } from "vitest";
import fs from "node:fs";

// L'écran « Marque » est celui de SINA (retours du 16 novembre 2026 sur la marque finie d'un client inventé) : aucun
// encadré des anciennes façons, aucune bulle posée sur la marque du client, le logo vectoriel montré comme les autres.
const read = (f: string) => fs.readFileSync(`src/components/studio/${f}`, "utf8");

describe("SINA — l'écran « Marque »", () => {
  it("l'encadré des angles n'est pas affiché au-dessus de la marque", () => {
    expect(read("tabs.tsx")).toContain('tab!=="strategie"&&tab!=="marque"&&<StrategyStatus/>');
  });
  it("la bulle « Première visite ? » ne se pose pas sur la marque ; le bouton du tutoriel reste", () => {
    const s = read("tutorial.tsx");
    expect(s).toContain('nudge && tab !== "marque" && createPortal(<TutorialNudge');
    expect(s).toMatch(/<button type="button" onClick=\{show\}/);
  });
  it("le logo vectoriel est montré en image, pas en case vide", () => {
    expect(read("tab-marque.tsx")).toContain('x.downloadHref && x.key !== "svg" &&');
  });
});
