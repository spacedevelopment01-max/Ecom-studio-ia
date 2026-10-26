/**
 * Theme Check sans téléchargement des documents Shopify (suivi #194, cause des échecs CI intermittents relevée par
 * Codex) : un schéma téléchargé vide était accepté tel quel et produisait de faux « ValidSchema ». Le studio, les scripts
 * de vérification et la CI passent désormais par src/lib/theme/shopify-docs.ts.
 * Les vérifications réelles tournent dans un processus séparé : le module Theme Check fixe ses dossiers à son chargement.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { writeShopifyDocs } from "@/lib/theme/shopify-docs";

const tmp = (p: string) => fs.mkdtempSync(path.join(os.tmpdir(), p));
// Réseau simulé comme en CI : débit limité par raw.githubusercontent.com (tests/helpers/docs-shopify-limites.cjs).
const emptyDocs = `--require ${path.join(process.cwd(), "tests/helpers/docs-shopify-limites.cjs")}`;
const runCheck = (env: Record<string, string>) => {
  const out = tmp("es-docs-check-");
  const r = spawnSync("npx", ["tsx", "scripts/theme-check.ts", path.join(out, "theme"), "atelier"], { env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} ${emptyDocs}`.trim(), ...env }, encoding: "utf8", timeout: 170_000 });
  fs.rmSync(out, { recursive: true, force: true });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
};

describe("Theme Check — documents Shopify locaux", () => {
  it("écrit toute l'arborescence attendue par le module, chaque fichier relu en JSON", () => {
    const dir = tmp("es-docs-");
    const { revision, schemas } = writeShopifyDocs(dir);
    expect(revision).toMatch(/^[0-9a-f]{40}$/);
    for (const r of ["filters", "objects", "tags", "latest", "shopify_system_translations"]) JSON.parse(fs.readFileSync(path.join(dir, "data", `${r}.json`), "utf8"));
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "schemas", "manifest_theme.json"), "utf8")) as { schemas: { uri: string }[] };
    expect(manifest.schemas.length).toBe(schemas);
    for (const s of manifest.schemas) expect(JSON.parse(fs.readFileSync(path.join(dir, "schemas", s.uri), "utf8"))).toBeTypeOf("object");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("défaut reproduit : un schéma vide donne de faux ValidSchema ; documents locaux, débit limité simulé : aucun téléchargement, thème valide", () => {
    const broken = tmp("es-docs-vides-");
    writeShopifyDocs(broken);
    fs.writeFileSync(path.join(broken, "schemas", "theme", "preset.json"), "");
    const bad = runCheck({ SHOPIFY_TLD_ROOT: broken, XDG_CACHE_HOME: path.join(broken, "cache") });
    expect(bad.status).toBe(1);
    expect(bad.out).toMatch(/ValidSchema .*preset\.json'?: Parse error at offset 0/);
    fs.rmSync(broken, { recursive: true, force: true });

    // Sans réglage de l'appelant : chargement du studio (documents écrits par le processus lui-même).
    const good = runCheck({ SHOPIFY_TLD_ROOT: "", XDG_CACHE_HOME: tmp("es-docs-cache-") });
    expect(good.out).not.toMatch(/TELECHARGEMENT-DOCS-SHOPIFY/);
    expect(good.out).not.toMatch(/^ERROR/m);
    expect(good.status).toBe(0);
  }, 360_000);
});
