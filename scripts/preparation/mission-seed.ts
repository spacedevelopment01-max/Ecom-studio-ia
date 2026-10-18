/** Preuve UI exclusivement synthétique. Refuse les données du studio et interdit tout réseau. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import { fixture, initializeSynthetic, simulatedDependencies } from "../../tests/preparation-fixtures";
import { validatedBrand, directionIdentity, editorialFixture } from "../../tests/preparation-mission-fixtures";
import { approve, stateOf, readyContract } from "@/lib/preparation/engine";
import { commitState, draft } from "@/lib/preparation/store";
import { reserveDirectionSeries, updateDirectionSeries, type CompleteDirection } from "@/lib/logo-v2/direction-series";
import { brandDiscovery } from "@/lib/logo-v2/discovery";
import { localTerritories } from "@/lib/logo-v2/territories";
import { buildCandidate } from "@/lib/logo-v2/construct";
import { saveDirectionPreview } from "@/lib/logo-v2/direction-preview";
import { chooseLogoV2 } from "@/lib/logo-v2/choose";
import { loadProject, saveBrand } from "@/lib/projects";
import { saveAsset } from "@/lib/library";
import { runForUser, withAiDisabled } from "@/lib/ai/access";
import { runWithLang } from "@/lib/i18n-server";
import { run, now, all } from "@/lib/db";
import { bindEditorial, recommendationCatalogue } from "@/lib/preparation/editorial";
import { placementHash } from "@/lib/preparation/media-context";
import { saveContentVersion } from "@/lib/seo-v2/store";
import { execTool } from "@/lib/exec-tool";
const dir = process.env.DATA_DIR;
if (!dir || !path.isAbsolute(dir) || !path.basename(dir).startsWith("ecs-preparation-test-")) throw new Error("DATA_DIR synthétique isolé obligatoire.");
if (fs.existsSync(path.join(dir, "mission-private.json"))) throw new Error("Ne pas écraser un essai existant.");
globalThis.fetch = async () => { throw new Error("Réseau interdit : preuve UI synthétique."); };
const cases: object[] = [];
await runWithLang({ ui: "fr", content: "fr" }, async () => {
  for (const business of ["products", "services"] as const) {
    const f = await fixture(business); initializeSynthetic(f.pid, f.input); const brand = validatedBrand(f.pid, f.input); saveBrand(f.pid, { ...brand, name: f.input.brandName, nameStatus: "provided" });
    await withAiDisabled("Harnais synthétique sans réseau", async () => {
      approve(f.pid, stateOf(f.pid)!.revision, "brief");
      const research = await simulatedDependencies.research(loadProject(f.pid), stateOf(f.pid)!.stages.brief!.data, null as any, false);
      commitState(f.pid, stateOf(f.pid)!.revision, s => draft(s, "research", research));
      approve(f.pid, stateOf(f.pid)!.revision, "research", { choiceId: research.recommendedId });
      const p = loadProject(f.pid), territories = localTerritories(brandDiscovery(p)).slice(0, 3).map((t, i) => ({ ...t, id: `t${i + 1}`, source: "local" as const, identity: directionIdentity(i) }));
      const series = reserveDirectionSeries(f.pid, "synthetic-browser");
      const directions: CompleteDirection[] = [];
      for (const [i, t] of territories.entries()) {
        const data = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="850"><rect width="1100" height="850" fill="#f6f2e9"/><path d="M220 430L400 ${170 + i * 50} 560 420 800 ${270 + i * 60}" fill="none" stroke="${t.identity.palette.primary}" stroke-width="32"/><text x="550" y="580" text-anchor="middle" font-size="50">${p.brand!.name}</text><text x="550" y="690" text-anchor="middle" font-size="23">DIRECTION ${i + 1} — SIMULATION</text></svg>`)).png().toBuffer();
        const logo = await saveAsset({ projectId: f.pid, userId: f.uid, data, name: `simulation-direction-${i + 1}.png`, mime: "image/png", role: "logo-v2", folderKey: "brand.logos", origin: "generated", status: "review", meta: { simulation: true, engine: "logo-v2", run: "synthetic-browser", territory: t, spec: buildCandidate(t, brandDiscovery(p), { family: "Inter", attempt: 0, symbol: null }).spec, artwork: { expected: { name: p.brand!.name }, provider: "simulation", textBox: null }, gate: { verdict: "FINAL", checker: "simulation" } } });
        const direction = { id: t.id, logoId: logo.id, label: t.name, concept: t.concept, identity: t.identity, territory: t, version: 1 };
        directions.push({ ...direction, previewId: await saveDirectionPreview(f.pid, f.uid, p.brand!.name, direction) });
      }
      updateDirectionSeries(f.pid, series.id, s => { s.territories = territories; s.directions = directions; });
      commitState(f.pid, stateOf(f.pid)!.revision, s => draft(s, "brand", { proposal: p.brand!, seriesId: series.id, directions, identityConfirmed: true, logoCandidates: directions.map(d => d.logoId), legalAvailability: "not_checked", provenance: "simulation" }));
      await runForUser(f.uid, () => chooseLogoV2(null, f.pid, directions[0].logoId), "normal", f.pid);
      approve(f.pid, stateOf(f.pid)!.revision, "brand", { logoId: directions[0].logoId });
      const { content, out } = await editorialFixture(f.pid);
      for (const item of content.documents) {
        for (const block of item.doc.blocks) if ("text" in block) block.text = `${item.doc.page.title} — ${block.kind === "h1" ? f.input.offerName : "Contenu synthétique pour vérifier la conservation, la présentation et la liaison des textes. Aucune qualité rédactionnelle d’un fournisseur réel n’est démontrée."}`;
        saveContentVersion(f.pid, item.docKey, item.doc, { verdict: "FINAL", note: "Verdict synthétique de preuve navigateur" });
      }
      const bound = bindEditorial(content, out, recommendationCatalogue(loadProject(f.pid)));
      bound.provenance = "simulation";
      bound.execution = { provider: "simulation", model: "injected", usageKey: "browser-test", at: now(), vision: false };
      bound.recommendation = { ...bound.recommendation!, selectedId: "atelier", status: "selected" };
      commitState(f.pid, stateOf(f.pid)!.revision, s => draft(s, "content", bound));
      // État de présentation construit, explicitement synthétique : les textes de ce harnais ne sont pas des livrables.
      // Le contrôle éditorial réel est exercé séparément par les tests et reste obligatoire en production.
      commitState(f.pid, stateOf(f.pid)!.revision, s => { s.stages.content!.status = "approved"; });
      const slots = structuredClone(bound.slots);
      for (const [i, slot] of slots.filter(s => s.kind === "image").slice(0, 2).entries()) {
        const width = slot.aspect === "9:16" ? 900 : 1600, height = slot.aspect === "1:1" ? 1600 : slot.aspect === "9:16" ? 1600 : 900;
        const data = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${i ? "#d9cdad" : "#c4d6ce"}"/><rect x="15%" y="15%" width="70%" height="55%" fill="#28504a"/><text x="50%" y="85%" text-anchor="middle" font-size="30">MÉDIA SYNTHÉTIQUE ${i + 1}</text></svg>`)).webp().toBuffer();
        slot.assetId = (await saveAsset({ projectId: f.pid, userId: f.uid, data, name: `simulation-scene-${i + 1}.webp`, mime: "image/webp", role: "scene", folderKey: "images.scenes", origin: business === "products" ? "generated" : "import", status: "review", meta: { simulation: true, gate: { verdict: "FINAL", checker: "simulation" }, ...(business === "services" ? { stock: { source: "pixabay", id: `synthetic-${i}`, author: "Simulation", page: "https://pixabay.com/", license: "Simulation — aucun média Pixabay collecté" } } : {}) } })).id;
        slot.alignment = { status: "accepted", reason: "Verdict injecté, aucune pertinence créative réelle démontrée.", contextHash: placementHash(loadProject(f.pid), bound, slot) };
      }
      const video = slots.find(s => s.kind === "video")!, file = path.join(dir, `synthetic-${business}.mp4`);
      await execTool("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=5", "-t", "4", "-c:v", "libx264", "-pix_fmt", "yuv420p", file]);
      video.assetId = (await saveAsset({ projectId: f.pid, userId: f.uid, data: fs.readFileSync(file), name: "simulation-clip.mp4", mime: "video/mp4", role: "clip", folderKey: "videos.shop", origin: "import", meta: { simulation: true } })).id;
      video.posterId = (await saveAsset({ projectId: f.pid, userId: f.uid, data: await sharp({ create: { width: 1280, height: 720, channels: 3, background: "#28504a" } }).jpeg().toBuffer(), name: "simulation-poster.jpg", mime: "image/jpeg", role: "video-poster", origin: "generated", sourceAssetId: video.assetId })).id;
      commitState(f.pid, stateOf(f.pid)!.revision, s => draft(s, "media", { slots, provenance: "simulation", notes: ["2 images et 1 clip synthétiques : collecte incomplète. Aucun fournisseur réel testé."] }));
      if (readyContract(f.pid)) throw new Error("Un lot incomplet ne doit pas être prêt.");
    });
    const token = crypto.randomBytes(32).toString("base64url");
    run("INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)", crypto.createHash("sha256").update(token).digest("hex"), f.uid, now() + 86400000, now());
    cases.push({ business, pid: f.pid, uid: f.uid, token });
  }
});
fs.writeFileSync(path.join(dir, "mission-private.json"), JSON.stringify(cases), { mode: 0o600 });
fs.writeFileSync(path.join(dir, "mission-public-proof.json"), JSON.stringify({ simulation: true, projects: cases.map((x: any) => ({ business: x.business, projectId: x.pid, ready: readyContract(x.pid) !== null, media: stateOf(x.pid)?.stages.media?.data.slots.map(s => ({ key: s.key, kind: s.kind, source: s.source, aspect: s.aspect, pageKey: s.pageKey, sectionKey: s.sectionKey, present: !!s.assetId, reviewed: !!s.reviewed })) })), aiCalls: all("SELECT id FROM ai_calls").length, themes: all("SELECT id FROM theme_versions").length }, null, 2));
console.log("Deux projets synthétiques préparés ; aucun fournisseur appelé. Identifiants de session gardés privés.");
