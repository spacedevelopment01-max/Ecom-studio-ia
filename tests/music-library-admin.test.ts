/**
 * Bibliothèque musicale du studio (Administration › Musiques) : vrai fichier audio exigé, licence obligatoire,
 * durée mesurée, choix par style du produit ou du métier, variante par projet, copie unique dans le projet.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("bibliothèque musicale du studio", async () => {
  const { addTrack, listTracks, pickTrack, libraryMusicForProject, removeTrack, sniffAudio, updateTrack } = await import("@/lib/music-library");
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "biblio-"));
  const wav = (name: string, seconds: number, f = 330) => {
    const file = path.join(dir, name);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `sine=f=${f}:d=${seconds}`, "-ac", "2", file]);
    return new Uint8Array(fs.readFileSync(file));
  };

  it("refuse un fichier qui n'est pas de l'audio, et un morceau sans licence", async () => {
    expect(sniffAudio(new TextEncoder().encode("<html>pas de la musique</html>"))).toBeNull();
    await expect(addTrack(new TextEncoder().encode("<html></html>"), { title: "x", artist: "", license: "CC BY" })).rejects.toThrow(/Format/);
    await expect(addTrack(wav("a.wav", 20), { title: "x", artist: "", license: " " })).rejects.toThrow(/licence/);
  });

  it("ajoute, classe par style, choisit selon le métier et copie une seule fois dans le projet", async () => {
    for (const t of listTracks()) removeTrack(t.id);
    const folk = await addTrack(wav("folk.wav", 60, 220), { title: "Folk du matin", artist: "Artiste A", license: "CC BY 4.0", sourceUrl: "https://exemple.test/folk", styles: ["acoustic"], mood: "pulse" });
    const lounge = await addTrack(wav("lounge.wav", 60, 440), { title: "Lounge doux", artist: "Artiste B", license: "CC BY 4.0", styles: ["lounge"], mood: "calm" });
    expect(folk.durationS).toBeGreaterThan(55);
    expect(listTracks().map((t) => t.id).sort()).toEqual([folk.id, lounge.id].sort());
    expect(pickTrack("acoustic", "pulse", 30, "projet-1")?.id).toBe(folk.id);
    expect(pickTrack("lounge", "calm", 30, "projet-1")?.id).toBe(lounge.id);
    // Trop court pour une vidéo de 2 minutes : pris quand même faute de mieux (la musique boucle), jamais un autre style.
    expect(pickTrack("acoustic", "pulse", 120, "projet-1")?.id).toBe(folk.id);
    updateTrack(folk.id, { enabled: false });
    expect(pickTrack("acoustic", "pulse", 30, "projet-1")).toBeNull();
    updateTrack(folk.id, { enabled: true });

    const u = await createUser(`biblio-${Date.now()}@test.fr`, "motdepasse-test", "B");
    const p = loadProject(seedImageFixture(u.id, "artisan"));
    const a = await libraryMusicForProject(p, "acoustic", "pulse", 30);
    expect(a?.licence).toBe("CC BY 4.0");
    expect(a?.credit).toMatch(/Folk du matin.*Artiste A.*CC BY 4\.0.*exemple\.test/);
    const b = await libraryMusicForProject(p, "acoustic", "pulse", 30);
    expect(b?.assetId).toBe(a?.assetId);
    for (const t of listTracks()) removeTrack(t.id);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});
