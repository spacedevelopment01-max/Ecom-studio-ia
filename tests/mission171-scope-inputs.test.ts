vi.mock("@/lib/public-download",()=>import("./public-download-double"));
/** Recette native sur comptes et fichiers fictifs. Aucune requête fournisseur. */
import { it, expect, vi, beforeEach, afterEach } from "vitest";
import sharp from "sharp";
import fs from "node:fs";
import dns from "node:dns/promises";
import { zipSync, strToU8 } from "fflate";
const jar = { token: "" }, sends = { n: 0 };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => jar.token ? { value: jar.token } : undefined, set: () => {}, delete: () => {} }) }));
vi.mock("@/lib/integrations/canva", () => ({ sendToCanva: async () => { sends.n++; return { ok: true }; }, importFromCanva: async () => [], canvaConnection: () => ({}) }));
import { createUser, startSession, userFromToken, requireAdmin } from "@/lib/auth";
import { all, id, now, one, run } from "@/lib/db";
import { sha256 } from "@/lib/secrets";
import { saveAsset, getAsset, assetData } from "@/lib/library";
import { withAccessScope } from "@/lib/access-scope";
import { enqueue, JobContext } from "@/lib/jobs";
import { handlers } from "../worker/handlers";
import { GET as fileGet } from "@/app/api/files/[fid]/route";
import { GET as projectGet } from "@/app/api/projects/[id]/route";
import { POST as upload } from "@/app/api/projects/[id]/files/route";
import { checkedUpload, assertStaticSvg } from "@/lib/upload-security";
import { signPreview, verifyPreview } from "@/lib/theme/preview-access";
import { signMedia, verifyMedia } from "@/lib/public-url";
import { revokeProjectLinks } from "@/lib/share-links";
import { handle, ok, body } from "@/lib/http";
import { z } from "zod";
import { rateTake } from "@/lib/rate-limit";
import { assertPublicUrl, checkedLookup } from "@/lib/engine/import-link";
import { openThemeZip } from "@/lib/theme/import";
import { importedArchive } from "@/lib/theme/imported";
import { previewBridgeTarget } from "@/lib/theme/preview-bridge-policy";

async function fixture(role = "client") {
  const u = await createUser(`lot9-${id()}@example.test`, "Mot-de-passe-fictif", "Compte fictif");
  run("UPDATE users SET role=? WHERE id=?", role, u.id);
  const pid = id(); run("INSERT INTO projects(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)", pid, u.id, "Projet de recette", now(), now());
  const bytes = await sharp({ create: { width: 24, height: 24, channels: 3, background: "#254163" } }).png().toBuffer();
  const a = await saveAsset({ userId: u.id, projectId: pid, data: bytes, name: "fixture.png", mime: "image/png", origin: "upload" });
  return { u, pid, a, bytes };
}
function login(uid?: string) { jar.token = uid ? id() : ""; if (uid) run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(jar.token), uid, now()+3600000, now()); }
beforeEach(() => { jar.token = ""; sends.n=0; vi.stubGlobal("fetch", async () => { throw new Error("External calls prohibited"); }); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

for (const mode of ["", "?thumb=1", "?download=1", "?info=1"]) {
  it(`matrice média ${mode || "original"} : A autorisé, B/administrateur/non connecté refusés`, async () => {
    const a = await fixture(), b = await fixture(), admin = await fixture("admin");
    for (const [uid, status] of [[a.u.id,200],[b.u.id,404],[admin.u.id,404],[undefined,401]] as const) {
      login(uid); const r=await fileGet(new Request(`http://localhost/api/files/${a.a.id}${mode}`), { params: Promise.resolve({fid:a.a.id}) });
      expect(r.status).toBe(status); expect(r.headers.get("cache-control")).toContain("no-store");
      if(status !== 200) { const text=await r.text(); expect(text).not.toContain(a.a.id); expect(text).not.toContain(a.a.name); expect(text).not.toContain(a.pid); }
      else if(mode !== "?info=1") await r.arrayBuffer();
    }
  });
}
it("matrice projet : aucun accès implicite du compte B ou d'un rôle administrateur", async () => {
  const a=await fixture(),b=await fixture(),admin=await fixture("admin");
  for(const [uid,status] of [[a.u.id,200],[b.u.id,404],[admin.u.id,404],[undefined,401]] as const) { login(uid); const r=await projectGet(new Request(`http://localhost/api/projects/${a.pid}`),{params:Promise.resolve({id:a.pid})});expect(r.status).toBe(status); if(status!==200)expect(await r.text()).not.toContain(a.pid); }
});
it("administration : le rôle envoyé par le navigateur n'a aucune autorité",async()=>{
 const a=await fixture();login(a.u.id);const route=handle(async(_req:Request)=>{await requireAdmin();return ok({secretAdmin:true});});
 const r=await route(new Request("http://localhost/api/admin/test?role=admin",{headers:{"x-role":"admin"}}));expect(r.status).toBe(403);expect(await r.text()).not.toContain("secretAdmin");
});
it("médias : sauvegarde croisée refusée avant toute écriture et dérivés confinés", async()=>{
 const a=await fixture(),b=await fixture();const count=all("SELECT id FROM assets").length;
 await expect(saveAsset({userId:a.u.id,projectId:a.pid,data:a.bytes,name:"clone.png",mime:"image/png",origin:"generated",sourceAssetId:b.a.id})).rejects.toThrow();
 expect(all("SELECT id FROM assets")).toHaveLength(count);
 expect(()=>withAccessScope({userId:a.u.id,projectId:a.pid},()=>assetData(b.a))).toThrow();
 expect(withAccessScope({userId:a.u.id,projectId:a.pid},()=>getAsset(b.a.id))).toBeUndefined();
});
it("la portée asynchrone de deux comptes simultanés reste distincte",async()=>{
 const a=await fixture(),b=await fixture();await Promise.all([a,b].map(x=>withAccessScope({userId:x.u.id,projectId:x.pid},async()=>{await Promise.resolve();expect(assetData(x.a)).toEqual(x.bytes);expect(getAsset(x===a?b.a.id:a.a.id)).toBeUndefined();})));
});
it("worker : chemin d'entrée valide exécuté une fois, même parcours après changement de propriétaire refusé",async()=>{
 const a=await fixture(),b=await fixture();const j=enqueue({userId:a.u.id,projectId:a.pid,type:"canva.send",payload:{assetId:a.a.id}});
 await handlers["canva.send"](new JobContext(j));expect(sends.n).toBe(1);
 run("UPDATE projects SET user_id=? WHERE id=?",b.u.id,a.pid);
 await expect(handlers["canva.send"](new JobContext(j))).rejects.toThrow();expect(sends.n).toBe(1);
});
it("mise en file : parents et dépendances ne peuvent référencer un autre compte",async()=>{
 const a=await fixture(),b=await fixture();const j=enqueue({userId:b.u.id,projectId:b.pid,type:"canva.send",payload:{assetId:b.a.id}});
 for(const related of [{parentId:j.id},{dependsOn:[j.id]}]) expect(()=>enqueue({userId:a.u.id,projectId:a.pid,type:"canva.send",payload:{assetId:a.a.id},...related})).toThrow();
});
it("liens signés : révocation, expiration, portée et transfert du propriétaire",async()=>{
 const a=await fixture(),b=await fixture();const preview=signPreview(a.u.id,a.pid),media=signMedia("asset",a.a.id);
 expect(verifyPreview(preview,a.pid)).toBe(a.u.id);expect(verifyMedia(media)?.ref).toBe(a.a.id);expect(verifyPreview(preview,b.pid)).toBeNull();
 expect(verifyPreview(signPreview(a.u.id,a.pid,-1),a.pid)).toBeNull();expect(verifyMedia(signMedia("asset",a.a.id,-1))).toBeNull();
 expect(()=>revokeProjectLinks(b.u.id,a.pid)).toThrow();revokeProjectLinks(a.u.id,a.pid);expect(verifyPreview(preview,a.pid)).toBeNull();expect(verifyMedia(media)).toBeNull();
 const next=signPreview(a.u.id,a.pid);expect(verifyPreview(next,a.pid)).toBe(a.u.id);run("UPDATE projects SET user_id=? WHERE id=?",b.u.id,a.pid);expect(verifyPreview(next,a.pid)).toBeNull();expect(verifyMedia(signMedia("asset",a.a.id))).toBeNull();
});
it("session : rotation invalide l'ancien jeton et la date d'expiration exacte est refusée",async()=>{
 const a=await fixture();login(a.u.id);const old=jar.token;await startSession(a.u.id);expect(userFromToken(old)).toBeNull();
 const token=id();run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)",sha256(token),a.u.id,now(),now());expect(userFromToken(token)).toBeNull();
});
it("limitation : réservation atomique avant une opération asynchrone",async()=>{
 const key=`controlled:${id()}`;const takes=await Promise.all(Array.from({length:30},async()=>{const admitted=rateTake([{key,max:8,windowMs:60000}]);await Promise.resolve();return admitted;}));expect(takes.filter(Boolean)).toHaveLength(8);
});
it("JSON : vraie limite de corps, origine opaque interdite aux API du compte",async()=>{
 const route=handle(async(req:Request)=>ok(await body(req,z.object({text:z.string()}))));
 expect((await route(new Request("http://localhost/api/test",{method:"POST",headers:{origin:"null"},body:"{}"}))).status).toBe(403);
 expect((await route(new Request("http://localhost/api/test",{method:"POST",headers:{"content-length":"1"},body:JSON.stringify({text:"x".repeat(3*1048576)})}))).status).toBe(413);
});
it("upload natif : vrai PNG conservé, faux PNG refusé et lot entier non sauvegardé",async()=>{
 const a=await fixture();login(a.u.id);const form=new FormData();form.append("files",new File([a.bytes],"photo.png",{type:"image/png"}));
 const good=await upload(new Request(`http://localhost/api/projects/${a.pid}/files`,{method:"POST",body:form}),{params:Promise.resolve({id:a.pid})});expect(good.status).toBe(200);
 const count=all("SELECT id FROM assets WHERE project_id=?",a.pid).length;const bad=new FormData();bad.append("files",new File([a.bytes],"photo2.png",{type:"image/png"}));bad.append("files",new File(["<html><script>alert(1)</script>"],"false.png",{type:"image/png"}));
 expect((await upload(new Request(`http://localhost/api/projects/${a.pid}/files`,{method:"POST",body:bad}),{params:Promise.resolve({id:a.pid})})).status).toBe(415);expect(all("SELECT id FROM assets WHERE project_id=?",a.pid)).toHaveLength(count);
});
for(const source of ['<svg onload="alert(1)"></svg>','<svg><foreignObject><p>Active</p></foreignObject></svg>','<svg><use href="&#106;avascript:alert(1)"/></svg>','<svg><image href="file:///fixture-private.png"/></svg>','<svg><style>@import "https://untrusted.example.test/a.css";</style></svg>'])it("SVG actif refusé avant décodage : "+source.slice(0,28),()=>expect(()=>assertStaticSvg(Buffer.from(source))).toThrow());
it("SVG statique avec gradient et logo accepté sans réécriture",async()=>{const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><defs><linearGradient id="a"><stop stop-color="#fff"/></linearGradient></defs><rect width="20" height="20" fill="url(#a)"/></svg>');expect(await checkedUpload(svg,"logo.svg","image/svg+xml")).toBe("image/svg+xml");});
it("faux conteneur vidéo ne peut devenir une liste de lecture pour ffmpeg",async()=>{await expect(checkedUpload(Buffer.from("#EXTM3U\nfile:///private-fixture"),"video.mp4","video/mp4")).rejects.toMatchObject({status:415});});
it("archive : traversée refusée, archive Shopify valide conservée",()=>{
 expect(()=>openThemeZip(zipSync({"layout/theme.liquid":strToU8("<html></html>"),"assets/../../outside.txt":strToU8("fixture")}))).toThrow();
 expect(openThemeZip(zipSync({"layout/theme.liquid":strToU8("<html></html>"),"assets/a.css":strToU8("body{color:red}")})).text.has("assets/a.css")).toBe(true);
});
it("cache d'archive : une lecture autorisée n'ouvre pas ensuite l'archive au compte B",async()=>{
 const a=await fixture(),b=await fixture();const arc=await saveAsset({projectId:a.pid,userId:a.u.id,name:"theme.zip",mime:"application/zip",origin:"upload",data:Buffer.from(zipSync({"layout/theme.liquid":strToU8("<html>Fixture A</html>")}))});
 const imported:any={archive:arc.id,root:"",groups:[],presets:{}};
 withAccessScope({userId:a.u.id,projectId:a.pid},()=>expect(importedArchive(imported).arc.text.size).toBe(1));
 expect(()=>withAccessScope({userId:b.u.id,projectId:b.pid},()=>importedArchive(imported))).toThrow();
});
it("SSRF : métadonnées, IPv6 encapsulée, identifiants et DNS mixte refusés sans transport",async()=>{
 for(const u of ["http://169.254.169.254/latest/meta-data/","http://127.0.0.1/","http://[::ffff:127.0.0.1]/","file:///fixture","https://user:pass@example.test/"])await expect(assertPublicUrl(u)).rejects.toThrow();
 vi.spyOn(dns,"lookup").mockResolvedValue([{address:"8.8.8.8",family:4},{address:"10.0.0.1",family:4}] as any);await expect(assertPublicUrl("https://fixture.example.test/")).rejects.toThrow();
 const result=await new Promise<any>(resolve=>checkedLookup("fixture.example.test",{},(err)=>resolve(err)));expect(result.code).toBe("EPRIVATEADDR");
});
it("pont aperçu : panier du même projet autorisé, API/administration/autre projet/traversée refusés",()=>{
 const origin="https://studio.example.test", frame=origin+"/preview/aaaa/v/current";
 expect(previewBridgeTarget(frame,origin+"/preview/aaaa/v/current~signed/cart/add.js","POST",origin)).not.toBeNull();
 for(const url of ["/api/me","/api/admin/settings","/preview/bbbb/v/current/cart.js","/preview/aaaa/v/current/%2e%2e/%2e%2e/admin","https://external.example.test/preview/aaaa/v/current/cart.js"]){expect(previewBridgeTarget(frame,new URL(url,origin).href,"POST",origin)).toBeNull();}
 expect(previewBridgeTarget(frame,origin+"/preview/aaaa/v/current/assets/a.js","POST",origin)).toBeNull();
});
