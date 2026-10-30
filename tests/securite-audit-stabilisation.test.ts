/**
 * Audit de stabilisation : sécurité. Bombe ZIP, taille des envois vérifiée avant lecture, lien public des médias
 * sans script, types de fichiers refusés, extension de stockage sûre, secret absent du processus de détourage.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { openThemeZip } from "@/lib/theme/import";
import { readForm } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { signMedia } from "@/lib/public-url";
import { saveAsset } from "@/lib/library";
import { putFile } from "@/lib/storage";
import { createUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { runWithLang } from "@/lib/i18n-server";

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

describe("Sécurité (audit de stabilisation)", () => {
  it("bombe ZIP : refusée AVANT décompression (fichier de 30 Mo de zéros compressé en quelques Ko)", () => {
    const zip = zipSync({ "theme/layout/theme.liquid": strToU8("<html></html>"), "theme/assets/bombe.bin": new Uint8Array(30 * 1024 * 1024) }, { level: 9 });
    expect(zip.length).toBeLessThan(200_000);
    expect(() => fr(() => openThemeZip(zip))).toThrow(/trop volumineux une fois décompressé/);
    // Un thème ordinaire passe toujours.
    const ok = zipSync({ "theme/layout/theme.liquid": strToU8("<html></html>"), "theme/sections/a.liquid": strToU8("x") });
    expect(fr(() => openThemeZip(ok)).text.has("sections/a.liquid")).toBe(true);
  });

  it("envoi de fichiers : taille annoncée vérifiée avant toute lecture du corps", async () => {
    const req = new Request("http://x/upload", { method: "POST", headers: { "content-length": String(700 * 1048576), "content-type": "multipart/form-data; boundary=x" }, body: "x" });
    await expect(fr(() => readForm(req, 600 * 1048576))).rejects.toBeInstanceOf(HttpError);
    const fd = new FormData();
    fd.append("a", "b");
    const small = new Request("http://x/upload", { method: "POST", body: fd });
    expect((await fr(() => readForm(small, 1048576))).get("a")).toBe("b");
  });

  it("lien public d'un média : SVG / document téléchargés en fichier brut, jamais exécutés ; images servies telles quelles", async () => {
    const u = await createUser(`sec${Date.now()}@test.fr`, "motdepasse-test", "S");
    const pid = `p-sec-${u.id}`;
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, u.id, "Sec", Date.now(), Date.now());
    const active=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expect(saveAsset({projectId:pid,userId:u.id,data:active,name:'active.svg',mime:'image/svg+xml',origin:'upload'})).rejects.toMatchObject({status:415});
    const svg = await saveAsset({ projectId: pid, userId: u.id, data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20"/></svg>'), name: "x.svg", mime: "image/svg+xml", origin: "upload" });
    // Fichier historique corrompu après un import désormais refusé : le téléchargement reste inerte.
    putFile(svg.storage_key,active);
    const { GET } = await import("@/app/api/public/media/[token]/[name]/route");
    const r = await GET(new Request("http://x"), { params: Promise.resolve({ token: signMedia("asset", svg.id) }) });
    expect(r.headers.get("content-type")).toBe("application/octet-stream");
    expect(r.headers.get("content-disposition")).toMatch(/attachment/);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("content-security-policy")).toMatch(/sandbox/);
    // Extension de stockage : jamais « .m3u8 » venue du nom (liste de lecture interprétée par ffmpeg).
    await expect(saveAsset({projectId:pid,userId:u.id,data:Buffer.from("#EXTM3U"),name:"clip.m3u8",mime:"application/x-inconnu",origin:"upload"})).rejects.toMatchObject({status:415});
    const pl = await saveAsset({ projectId: pid, userId: u.id, data: Buffer.from("#EXTM3U"), name: "clip.m3u8", mime: "application/x-inconnu", origin: "generated" });
    expect(pl.storage_key.endsWith(".bin")).toBe(true);
  });

  it("types refusés à l'envoi (HTML, XML, scripts) ; logo de création : image uniquement ; détourage sans secret", () => {
    const files = fs.readFileSync("src/app/api/projects/[id]/files/route.ts", "utf8");
    expect(files).toMatch(/xml\(\?!\.\*svg\)/);
    expect(files).toMatch(/readForm\(req, 600 \* 1048576\)/);
    const start = fs.readFileSync("src/lib/project-start.ts", "utf8");
    expect(start).toMatch(/Format de logo non pris en charge/);
    const cutout = fs.readFileSync("src/lib/media/cutout.ts", "utf8");
    expect(cutout).toMatch(/env: childEnv\(model\)/);
    expect(cutout).not.toMatch(/\.\.\.process\.env, CUTOUT_MODEL/);
    // La seconde route délègue à la même sauvegarde native que SYNA ; le contrôle reste exécuté.
    for (const f of ["src/app/api/posts/[pid]/route.ts", "src/lib/social-v2/manual.ts"]) expect(fs.readFileSync(f, "utf8")).toMatch(/FROM connections WHERE id\s*=\s*\? AND user_id\s*=\s*\?/);
    expect(fs.readFileSync("src/app/api/projects/[id]/posts/route.ts", "utf8")).toContain("createManualPost(p,user.id,b)");
  });
});
