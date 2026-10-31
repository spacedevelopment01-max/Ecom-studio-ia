/** SYNA lot 0 (#282) : réglages d'affichage — projet > compte > défaut, valeurs invalides ignorées, bornes respectées. */
import { describe, expect, it } from "vitest";
import { SYNA_DEFAULT_PREFS, resetAccountSynaPrefs, resolveSynaPrefs, sanitizeSynaPrefs, synaScopeAttributes } from "@/lib/syna-ui/preferences";

describe("réglages SYNA", () => {
  it("par défaut : Encre, comme le Studio, bleu d'encre, 440 px, confortable, texte normal, épinglé", () => {
    const p = resolveSynaPrefs();
    expect(p).toMatchObject({ mode: "encre", appearance: "auto", accent: "encre", convoWidth: 440, density: "comfortable", textSize: "normal", panel: "pinned" });
    expect(Object.values(p.source).every((s) => s === "default")).toBe(true);
    expect(Object.isFrozen(SYNA_DEFAULT_PREFS)).toBe(true);
  });
  it("Plein cadre prend le cobalt et 420 px s'ils ne sont pas choisis", () => {
    expect(resolveSynaPrefs({ mode: "plein" })).toMatchObject({ mode: "plein", accent: "cobalt", convoWidth: 420 });
    expect(resolveSynaPrefs({ mode: "plein", accent: "prusse", convoWidth: 500 })).toMatchObject({ accent: "prusse", convoWidth: 500 });
  });
  it("le projet l'emporte sur le compte, champ par champ", () => {
    const p = resolveSynaPrefs({ mode: "plein", appearance: "dark", density: "compact" }, { mode: "encre", textSize: "large" });
    expect(p).toMatchObject({ mode: "encre", appearance: "dark", density: "compact", textSize: "large", accent: "encre" });
    expect(p.source).toMatchObject({ mode: "project", appearance: "account", density: "account", textSize: "project", accent: "default", panel: "default" });
  });
  it("ignore les valeurs inconnues et ramène la largeur dans 360–560 px au pas de 20", () => {
    expect(sanitizeSynaPrefs({ mode: "cockpit", appearance: 3, accent: "rose", density: "", textSize: null, panel: "flottant", x: 1 })).toEqual({});
    expect(sanitizeSynaPrefs({ convoWidth: 1000 }).convoWidth).toBe(560);
    expect(sanitizeSynaPrefs({ convoWidth: 10 }).convoWidth).toBe(360);
    expect(sanitizeSynaPrefs({ convoWidth: 447 }).convoWidth).toBe(440);
    expect(sanitizeSynaPrefs({ convoWidth: Number.NaN })).toEqual({});
    expect(sanitizeSynaPrefs({ accent: null, convoWidth: null })).toEqual({ accent: null, convoWidth: null });
    expect(sanitizeSynaPrefs("plein")).toEqual({});
    expect(sanitizeSynaPrefs(null)).toEqual({});
  });
  it("« Rétablir » efface les réglages du compte sans toucher aux exceptions d'un projet", () => {
    const project = { mode: "plein" as const };
    expect(resolveSynaPrefs(resetAccountSynaPrefs(), project)).toMatchObject({ mode: "plein", appearance: "auto", density: "comfortable" });
  });
  it("les attributs posés sur le conteneur décrivent toute la présentation", () => {
    expect(synaScopeAttributes(resolveSynaPrefs(undefined, { mode: "plein", appearance: "dark", panel: "collapsed" }))).toEqual({
      "data-syna-mode": "plein", "data-syna-scheme": "dark", "data-syna-accent": "cobalt", "data-syna-density": "comfortable", "data-syna-text": "normal", "data-syna-panel": "collapsed",
    });
  });
});
