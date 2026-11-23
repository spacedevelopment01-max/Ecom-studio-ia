/**
 * Le carnet des juges (22 novembre 2026) : chaque image relue par SINA y est notée (gardée ou refusée, et pourquoi), le
 * propriétaire dit oui ou non, et l'accord entre le relecteur et lui se mesure. Aucun appel d'IA.
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("le carnet des juges", async () => {
  const J = await import("@/lib/syna-agent/juges");
  const { saveAsset } = await import("@/lib/library");
  const { run } = await import("@/lib/db");
  const { account, project } = await import("./conversation209-fixtures");
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#ffffff" } }).png().toBuffer();

  it("le relecteur note, le propriétaire juge, l'accord se mesure (laissé passer, trop sévère)", async () => {
    run("DELETE FROM verdicts_images");
    const u = await account(), pid = project(u);
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push((await saveAsset({ projectId: pid, userId: u.id, data: png, name: `i${i}.png`, mime: "image/png", role: "brand-board", origin: "generated" })).id);
    J.noterRelecture({ assetId: ids[0], userId: u.id, projectId: pid, travail: "le logo", garde: true });
    J.noterRelecture({ assetId: ids[1], userId: u.id, projectId: pid, travail: "le logo", garde: false, raison: "le nom n'y est pas écrit exactement" });
    J.noterRelecture({ assetId: ids[2], userId: u.id, projectId: pid, travail: "la grande scène", garde: true });
    J.noterRelecture({ assetId: ids[3], userId: u.id, projectId: pid, travail: "la grande scène", garde: false });
    // Pas encore jugées : elles passent en premier dans le carnet ; l'accord n'est pas mesuré.
    expect(J.carnet().slice(0, 4).every((x) => x.proprietaire === null)).toBe(true);
    expect(J.accord()).toMatchObject({ jugees: 0, part: null, mesure: false });
    expect(J.verdictDuProprietaire(ids[0], "oui")).toBe(true);  // d'accord
    expect(J.verdictDuProprietaire(ids[1], "non")).toBe(true);  // d'accord
    expect(J.verdictDuProprietaire(ids[2], "non")).toBe(true);  // laissé passer
    expect(J.verdictDuProprietaire(ids[3], "oui")).toBe(true);  // trop sévère
    expect(J.verdictDuProprietaire("inconnue", "oui")).toBe(false);
    const a = J.accord();
    expect(a).toMatchObject({ jugees: 4, accords: 2, part: 0.5, laissePasser: 1, tropSevere: 1, mesure: false });
    expect(a.parTravail.find((x) => x.travail === "le logo")).toEqual({ travail: "le logo", jugees: 2, part: 1 });
    expect(J.ACCORD_MIN).toBe(20);
    // Une relecture refaite sur la même image remplace le verdict du relecteur, jamais celui du propriétaire.
    J.noterRelecture({ assetId: ids[0], userId: u.id, projectId: pid, travail: "le logo", garde: false });
    expect(J.carnet().find((x) => x.assetId === ids[0])).toMatchObject({ garde: false, proprietaire: "oui" });
  });

  it("la planche note chaque verdict de son relecteur au carnet ; sa règle de la note de 8 ne change pas", () => {
    const src = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(src).toContain("if (slot && why !== \"non relue\") { try { noterRelecture({ assetId: id, userId: o.who.userId, projectId: o.who.projectId, travail: travailDeLImage(slot), garde: status === \"ready\", raison: why }); }");
    // La note de 8 vaut toujours, même avec ok = faux ou sans ok (essai réel de Nadia, 23 novembre 2026).
    expect(src).toContain("if (v.score != null && v.score < NOTE_MIN)");
    expect(J.travailDeLImage("logo")).toBe("le logo");
    expect(J.travailDeLImage("site")).toBe("le haut du site");
  });

  it("l'administration : un onglet pour juger, ses images servies aux seuls administrateurs", () => {
    expect(fs.readFileSync("src/components/admin.tsx", "utf8")).toContain('["juges", "Juges des images", "Image judges"]');
    const img = fs.readFileSync("src/app/api/admin/verdicts/[aid]/route.ts", "utf8");
    expect(img).toContain("await requireAdmin();");
    expect(img).toContain("SELECT 1 FROM verdicts_images WHERE asset_id=?");
    expect(fs.readFileSync("src/app/api/admin/verdicts/route.ts", "utf8").match(/await requireAdmin\(\);/g)).toHaveLength(2);
  });
});
