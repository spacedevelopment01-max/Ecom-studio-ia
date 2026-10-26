/**
 * Suivi #194 (constat de Codex) : dans l'onglet Boutique, le menu « … » d'une section masquée était inutilisable.
 * La ligne entière était à 60 % d'opacité, ce qui en fait un contexte d'empilement : son menu (z-40) passait sous la
 * ligne suivante et sous le bouton « Ajouter une section après … » ; au téléphone, il s'ouvrait aussi sous la barre
 * d'onglets. Vérification dans le navigateur (clic normal, ordinateur et téléphone) :
 *   npx tsx scripts/section-masquee-studio-check.ts <dossier-captures>
 * Ce test garde les trois conditions dans le code de la ligne et du menu.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = fs.readFileSync(path.join(process.cwd(), "src/components/studio/tab-boutique.tsx"), "utf8");
const rowLine = src.split("\n").find((l) => l.includes('"relative flex items-center gap-1.5 rounded-xl border bg-card p-1.5 text-sm"'));
const menuLine = src.split("\n").find((l) => l.includes('role="menu"') && l.includes("w-60"));

describe("Onglet Boutique — menu d'une section masquée", () => {
  it("la ligne d'une section masquée n'est pas rendue translucide en entier (sinon son menu passe dessous)", () => {
    expect(rowLine).toBeDefined();
    expect(rowLine).not.toMatch(/disabled\s*&&\s*"[^"]*opacity/);
    expect(rowLine).not.toMatch(/\bopacity-\d+/);
  });

  it("la ligne dont le menu est ouvert passe au-dessus des lignes suivantes", () => {
    expect(rowLine).toMatch(/menuFor === s\.id && "z-40"/);
  });

  it("le menu s'ouvre vers le haut ou défile quand la place manque (barre d'onglets du téléphone, bas de liste)", () => {
    expect(menuLine).toBeDefined();
    expect(menuLine).toMatch(/ref=\{menuBox\}/);
    expect(menuLine).toMatch(/menuUp \? "bottom-full mb-1" : "top-full mt-1"/);
    expect(src).toMatch(/\[data-mobile-nav\]/);
    expect(src).toMatch(/scrollIntoView\(\{ block: "nearest" \}\)/);
  });
});
