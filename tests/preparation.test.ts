import { describe, it, expect, vi, afterEach } from "vitest";
import {
  restoreForReview,
  initialize,
  approve,
  stateOf,
  historyOf,
  readyContract,
  queuePreparation,
  runPreparation,
  confirmIdentity,
  assignMedia,
  editBrief,
  references,
  setPeopleConsent,
  blockers,
} from "@/lib/preparation/engine";
import { stageOf, commitState, draft } from "@/lib/preparation/store";
import { realDependencies } from "@/lib/preparation/deps";
import { createQuote, quoteOf } from "@/lib/preparation/quote";
import { JobContext, getJob, completeJob, failJob } from "@/lib/jobs";
import { all, one, run } from "@/lib/db";
import { loadProject, saveProduct } from "@/lib/projects";
import { runForUser } from "@/lib/ai/access";
import { runWithLang } from "@/lib/i18n-server";
import { latestContent, saveContentVersion } from "@/lib/seo-v2/store";
import { validateResearch } from "@/lib/preparation/research-ai";
import { buildBrief } from "@/lib/image-v2/brief";
import {
  fixture,
  syntheticAsset,
  simulatedDependencies,
  CASES,
} from "./preparation-fixtures";
import type { Dependencies } from "@/lib/preparation/deps";
import type { Step } from "@/lib/preparation/types";
afterEach(() => vi.unstubAllGlobals());
const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
async function execute(
  pid: string,
  step: Step,
  action: "generate" | "analyze" | "logo" | "image" = "generate",
  opts: {
    slot?: string;
    correction?: string;
    paid?: boolean;
    capMicro?: number;
  } = {},
  deps: Dependencies = simulatedDependencies,
) {
  const s = stateOf(pid)!;
  const q = queuePreparation(pid, s.revision, step, action, {
    paid: false,
    capMicro: 0,
    ...opts,
  });
  if (!q.job) return q;
  run("UPDATE jobs SET status='running',attempts=1 WHERE id=?", q.job.id);
  const ctx = new JobContext(getJob(q.job.id)!);
  const p = loadProject(pid);
  try {
    const out = await fr(() =>
      runForUser(p.userId, () => runPreparation(ctx, deps), "normal", pid),
    );
    completeJob(q.job.id, out);
    return out;
  } catch (e) {
    failJob(getJob(q.job.id)!, e, { permanent: true });
    throw e;
  }
}
const accept = (pid: string, step: Step, opts = {}) =>
  fr(() => approve(pid, stateOf(pid)!.revision, step, opts));
async function throughBrand(pid: string) {
  accept(pid, "brief");
  await execute(pid, "research");
  accept(pid, "research", { choiceId: "transparence" });
  await execute(pid, "brand");
  let s = stateOf(pid)!;
  const b = s.stages.brand!.data.proposal;
  confirmIdentity(pid, s.revision, {
    name: b.name,
    tagline: b.tagline,
    palette: b.palette,
    fonts: b.fonts,
  });
  await execute(pid, "brand", "logo");
  s = stateOf(pid)!;
  accept(pid, "brand", { logoId: s.stages.brand!.data.logoCandidates[0] });
}
async function finish(pid: string) {
  await throughBrand(pid);
  await execute(pid, "content");
  accept(pid, "content");
  for (const slot of stateOf(pid)!.stages.media!.data.slots) {
    await execute(pid, "media", "image", { slot: slot.key });
    const s = stateOf(pid)!;
    assignMedia(
      pid,
      s.revision,
      slot.key,
      s.stages.media!.data.slots.find((x) => x.key === slot.key)!.assetId!,
      "none_confirmed",
    );
  }
  accept(pid, "media");
  return readyContract(pid)!;
}
describe("Parcours amont — moteur réel, fournisseurs injectés et données isolées", () => {
  it.each([0, 1, 2, 3])(
    "parcours complet et reprise du cas synthétique %i, sans thème ni dépenses",
    async (i) => {
      const f = await fixture(CASES[i].business, i);
      initialize(f.pid, f.input);
      const ready = await finish(f.pid);
      expect(ready).not.toBeNull();
      expect(ready.provenance).toBe("simulation");
      expect(ready.clientBrief.description).toBe(f.input.description);
      expect(ready.clientBrief.constraints).toBe(f.input.constraints);
      expect(ready.strategy.angles[0].title).toBe(
        "Décider sur des éléments vérifiables",
      );
      expect(
        ready.pages.every((p) => (p.kind !== "contact" ? !!p.docKey : true)),
      ).toBe(true);
      expect(ready.media.every((m) => m.reviewed && m.assetId)).toBe(true);
      expect(ready.research.angles).toHaveLength(5);
      const home = ready.documents.find(d => d.doc.page.key === "home")!.doc;
      expect(ready.copy.hero.text).toBe(home.blocks.filter(b => b.kind === "p").map(b => "text" in b ? b.text : "").join("\n\n"));
      expect(ready.copyReadiness.status).toBe("review_required");
      expect(ready.copyReadiness.provisionalFields).toContain("shipping.body_html");
      expect(JSON.parse(JSON.stringify(readyContract(f.pid)))).toEqual(ready);
      expect(historyOf(f.pid).length).toBeGreaterThan(15);
      expect(
        one<{ n: number }>(
          "SELECT COUNT(*) n FROM theme_versions WHERE project_id=?",
          f.pid,
        )?.n,
      ).toBe(0);
      expect(
        one<{ n: number }>(
          "SELECT COUNT(*) n FROM ai_calls WHERE project_id=?",
          f.pid,
        )?.n,
      ).toBe(0);
      expect(
        all<{ type: string }>(
          "SELECT type FROM jobs WHERE project_id=?",
          f.pid,
        ).every((x) => x.type === "project.prepare"),
      ).toBe(true);
      if (f.input.business === "services") {
        expect(ready.services?.services).toHaveLength(
          f.input.services.services.length,
        );
        expect(ready.pages.filter((p) => p.kind === "service")).toHaveLength(
          f.input.services.services.length,
        );
        expect(JSON.stringify(ready.pages)).not.toMatch(/stock|panier/);
      }
    },
  );
  it("garde les consignes et le lien exacts ; demande seulement les informations essentielles", async () => {
    const f = await fixture();
    const input = {
      ...f.input,
      offerUrl: "https://offre.example/a?version=1",
      target: "",
    };
    const s = initialize(f.pid, input);
    expect(s.stages.brief!.data.input).toEqual(input);
    expect(s.stages.brief!.data.missing).toEqual([
      "À qui cette offre s’adresse-t-elle ?",
    ]);
    expect(() => accept(f.pid, "brief")).toThrow(/s’adresse/);
    expect(() =>
      queuePreparation(f.pid, s.revision, "research", "generate", {
        paid: false,
        capMicro: 0,
      }),
    ).toThrow(/Validez/);
  });
  it("réutilise une proposition fraîche ; double demande et devis périmé sans nouveau travail", async () => {
    const f = await fixture();
    initialize(f.pid, f.input);
    accept(f.pid, "brief");
    const q = createQuote(f.pid, "research", "generate");
    const s = stateOf(f.pid)!;
    const a = queuePreparation(f.pid, s.revision, "research", "generate", {
      paid: false,
      capMicro: 0,
    });
    expect(() =>
      queuePreparation(f.pid, s.revision, "research", "generate", {
        paid: false,
        capMicro: 0,
      }),
    ).toThrow(/Rechargez/);
    expect(() => quoteOf(f.pid, q.id)).toThrow(/plus valable/);
    run("UPDATE jobs SET status='failed' WHERE id=?", a.job!.id);
    commitState(f.pid, stateOf(f.pid)!.revision, (n) => {
      delete n.pending;
    });
    await execute(f.pid, "research", "generate", {
      correction: "Utiliser les mêmes liens sans en ajouter.",
    });
    const before = all("SELECT id FROM jobs WHERE project_id=?", f.pid).length;
    const r = await execute(f.pid, "research");
    expect(r).toHaveProperty("reused", true);
    expect(all("SELECT id FROM jobs WHERE project_id=?", f.pid)).toHaveLength(
      before,
    );
  });
  it("changement amont : conserve les versions approuvées et bloque la suite obsolète", async () => {
    const f = await fixture();
    initialize(f.pid, f.input);
    const ready = await finish(f.pid);
    const before = historyOf(f.pid).find((x) => x.revision === ready.revision)!;
    editBrief(f.pid, stateOf(f.pid)!.revision, {
      ...f.input,
      target: "Associations et médiathèques",
    });
    expect(
      JSON.parse(
        one<{ value: string }>(
          "SELECT value FROM memory WHERE project_id=? AND key='project.ready_for_theme'",
          f.pid,
        )!.value,
      ),
    ).toEqual({ ready: false, revision: stateOf(f.pid)!.revision });
    expect(readyContract(f.pid)).toBeNull();
    expect(stateOf(f.pid)!.stages.content!.status).toBe("stale");
    expect(stateOf(f.pid)!.stages.content!.data).toEqual(
      before.stages.content!.data,
    );
    expect(historyOf(f.pid).find((x) => x.revision === ready.revision)).toEqual(
      before,
    );
    expect(() => accept(f.pid, "media")).toThrow(/Validez/);
  });
  it("échec fournisseur : résultat conservé, une seule tentative automatique et reprises limitées", async () => {
    const f = await fixture();
    initialize(f.pid, f.input);
    accept(f.pid, "brief");
    let calls = 0;
    const deps = {
      ...simulatedDependencies,
      research: async () => {
        calls++;
        throw new Error(
          "Fournisseur indisponible : réessayez après vérification.",
        );
      },
    };
    await expect(
      execute(f.pid, "research", "generate", {}, deps),
    ).rejects.toThrow(/indisponible/);
    expect(stateOf(f.pid)!.pending).toBeUndefined();
    expect(stateOf(f.pid)!.error?.message).toMatch(/indisponible/);
    expect(
      all<any>(
        "SELECT status,max_attempts FROM jobs WHERE project_id=?",
        f.pid,
      ),
    ).toEqual([expect.objectContaining({ status: "failed", max_attempts: 1 })]);
    await expect(
      execute(f.pid, "research", "generate", {}, deps),
    ).rejects.toThrow(/Décrivez/);
    await expect(
      execute(
        f.pid,
        "research",
        "generate",
        { correction: "Relire uniquement la source fournie." },
        deps,
      ),
    ).rejects.toThrow(/indisponible/);
    await expect(
      execute(
        f.pid,
        "research",
        "generate",
        { correction: "Troisième demande interdite." },
        deps,
      ),
    ).rejects.toThrow(/Deux essais/);
    expect(calls).toBe(2);
  });
  it("budget insuffisant : aucun job ni appel ajouté", async () => {
    const f = await fixture();
    initialize(f.pid, f.input);
    accept(f.pid, "brief");
    expect(() =>
      queuePreparation(
        f.pid,
        stateOf(f.pid)!.revision,
        "research",
        "generate",
        { paid: true, capMicro: 1e12 },
      ),
    ).toThrow();
    expect(all("SELECT id FROM jobs WHERE project_id=?", f.pid)).toHaveLength(
      0,
    );
    expect(
      all("SELECT id FROM ai_calls WHERE project_id=?", f.pid),
    ).toHaveLength(0);
  });
  it("modification pendant attente : arrêt avant fournisseur, et modifications externes détectées", async () => {
    const f = await fixture();
    initialize(f.pid, f.input);
    accept(f.pid, "brief");
    const q = queuePreparation(
      f.pid,
      stateOf(f.pid)!.revision,
      "research",
      "generate",
      { paid: false, capMicro: 0 },
    );
    references(f.pid, stateOf(f.pid)!.revision, ["https://changed.example"]);
    const fn = vi.fn(simulatedDependencies.research);
    await expect(
      runPreparation(new JobContext(getJob(q.job!.id)!), {
        ...simulatedDependencies,
        research: fn,
      }),
    ).rejects.toThrow(/changé/);
    expect(fn).not.toHaveBeenCalled();
    const p = loadProject(f.pid);
    saveProduct(f.pid, { ...p.product, name: "Autre nom hors parcours" });
    expect(() => createQuote(f.pid, "research", "generate")).toThrow(
      /hors du parcours/,
    );
  });
  it("refus de source absente, citation inventée ou angles identiques", async () => {
    const f = await fixture();
    initialize(f.pid, f.input);
    accept(f.pid, "brief");
    await execute(f.pid, "research");
    const s = stateOf(f.pid)!,
      r = structuredClone(s.stages.research!.data);
    expect(() =>
      validateResearch({
        ...r,
        observations: [
          { sourceId: "source-1", quote: "Statistique inventée 90%" },
        ],
      }),
    ).toThrow(/citation/);
    expect(() =>
      validateResearch({
        ...r,
        angles: r.angles.map((a) => ({ ...a, positioning: "Identique" })),
      }),
    ).toThrow(/distinctes/);
    commitState(f.pid, s.revision, (n) => {
      n.stages.research!.data.sources = [];
    });
    expect(() => accept(f.pid, "research", { choiceId: "usage" })).toThrow(
      /Aucune source/,
    );
  });
  it("un brouillon à compléter n’est jamais un contrat prêt, même après une ancienne validation", async () => {
    const f = await fixture(); initialize(f.pid, f.input); await finish(f.pid);
    const s = stateOf(f.pid)!, c = structuredClone(s.stages.content!.data), d = c.documents[0];
    d.doc.blocks.push({ id: "missing", kind: "p", text: "[À compléter : conditions de l’offre]" });
    saveContentVersion(f.pid, d.docKey, d.doc, { verdict: "PROVISIONAL" });
    commitState(f.pid, s.revision, n => { n.stages.content!.data = c; });
    expect(readyContract(f.pid)).toBeNull();
    expect(blockers(f.pid).join(" ")).toMatch(/compléter/);
    expect(() => accept(f.pid, "content")).toThrow(/compléter/);
  });
  it("textes refusés même après modification manuelle ; changement de texte invalide le contrat", async () => {
    const f = await fixture();
    initialize(f.pid, f.input);
    await finish(f.pid);
    const s = stateOf(f.pid)!,
      c = structuredClone(s.stages.content!.data),
      d = c.documents[0];
    d.doc.blocks.push({
      id: "bad",
      kind: "p",
      text: "Selon une étude, 90 % des clients guérissent en 24 h.",
    });
    d.verdict = "PROVISIONAL";
    saveContentVersion(f.pid, d.docKey, d.doc, { verdict: "PROVISIONAL" });
    expect(readyContract(f.pid)).toBeNull();
    expect(blockers(f.pid).join(" ")).toMatch(/texte a été modifié/);
    commitState(f.pid, s.revision, (n) => draft(n, "content", c));
    expect(() => accept(f.pid, "content")).toThrow(/corriger/);
  });
  it("corrige une page sans refaire les autres et conserve leurs identifiants et documents", async () => {
    const f = await fixture("services");
    initialize(f.pid, f.input);
    await throughBrand(f.pid);
    await execute(f.pid, "content");
    const old = structuredClone(stateOf(f.pid)!.stages.content!.data);
    await execute(f.pid, "content", "generate", {
      slot: "service:1",
      correction: "Rendre la méthode de cette prestation plus claire.",
    });
    const c = stateOf(f.pid)!.stages.content!.data;
    expect(c.documents.filter((x) => x.doc.page.key !== "service:1")).toEqual(
      old.documents.filter((x) => x.doc.page.key !== "service:1"),
    );
    expect(c.pages.map((x) => x.docKey)).toEqual(
      old.pages.map((x) => x.docKey),
    );
  });
  it("médias : rejets, tiers, stock, ancienne marque et autorisation par emplacement", async () => {
    const f = await fixture(),
      other = await fixture();
    initialize(f.pid, f.input);
    await throughBrand(f.pid);
    await execute(f.pid, "content");
    accept(f.pid, "content");
    const key = stateOf(f.pid)!.stages.media!.data.slots[0].key;
    const assign = (
      aid: string,
      c: "none_confirmed" | "this_slot" = "none_confirmed",
    ) => assignMedia(f.pid, stateOf(f.pid)!.revision, key, aid, c);
    expect(() => assign(other.input.photoIds[0])).toThrow(/autre projet/);
    for (const meta of [
      { gate: { verdict: "REJECTED", fatal: true } },
      { stock: true },
      { preparation: { brandHash: "ancienne-identite" } },
    ]) {
      const a = await syntheticAsset(f.pid, "scene", "generated", meta);
      expect(() => assign(a)).toThrow();
    }
    const person = await syntheticAsset(f.pid, "original", "upload", {
      hasPerson: true,
    });
    expect(() => assign(person)).toThrow(/autorisation/);
    setPeopleConsent(f.pid, stateOf(f.pid)!.revision, key, "this_slot");
    expect(
      stateOf(f.pid)!.stages.media!.data.slots[1].peopleConsent,
    ).toBeUndefined();
    assign(person, "this_slot");
    expect(stateOf(f.pid)!.stages.media!.data.slots[0].reviewed).toBe(true);
    const p = loadProject(f.pid);
    const denied = buildBrief(
      p,
      { kind: "lifestyle", references: [person], peopleAllowed: false },
      { peopleAllowed: false },
    );
    const permitted = buildBrief(
      p,
      { kind: "lifestyle", references: [person], peopleAllowed: true },
      { peopleAllowed: true },
    );
    expect(denied.people).toBe(false);
    expect(permitted.people).toBe(true);
  });
  it("adaptateur local réel : pages de prestations séparées et prix/contraintes intacts, sans réseau", async () => {
    const f = await fixture("services");
    initialize(f.pid, f.input);
    await throughBrand(f.pid);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("Réseau interdit en test local");
      }),
    );
    await execute(f.pid, "content", "generate", {}, realDependencies);
    const c = stateOf(f.pid)!.stages.content!.data;
    expect(
      c.documents.filter((d) => d.doc.type === "service_page"),
    ).toHaveLength(2);
    expect(new Set(c.documents.map((d) => d.docKey)).size).toBe(
      c.documents.length,
    );
    expect(
      c.documents.find((d) => d.doc.page.key === "service:0")?.doc.page.title,
    ).toBe("Diagnostic");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("restaure une version pour vérification sans refaire recherche, identité, textes ou images", async () => {
    const f = await fixture();
    initialize(f.pid, f.input);
    const ready = await finish(f.pid);
    const jobs = all("SELECT id FROM jobs WHERE project_id=?", f.pid).length;
    editBrief(f.pid, stateOf(f.pid)!.revision, {
      ...f.input,
      target: "Autre public",
    });
    restoreForReview(f.pid, stateOf(f.pid)!.revision, ready.revision);
    accept(f.pid, "brief");
    expect(await execute(f.pid, "research")).toHaveProperty("reused", true);
    accept(f.pid, "research", { choiceId: "transparence" });
    expect(await execute(f.pid, "brand")).toHaveProperty("reused", true);
    accept(f.pid, "brand");
    expect(await execute(f.pid, "content")).toHaveProperty("reused", true);
    accept(f.pid, "content");
    const slots = stateOf(f.pid)!.stages.media!.data.slots;
    expect(slots.map((x) => x.assetId)).toEqual(
      ready.media.map((x) => x.assetId),
    );
    for (const slot of slots)
      assignMedia(
        f.pid,
        stateOf(f.pid)!.revision,
        slot.key,
        slot.assetId!,
        "none_confirmed",
      );
    accept(f.pid, "media");
    expect(readyContract(f.pid)).not.toBeNull();
    expect(all("SELECT id FROM jobs WHERE project_id=?", f.pid)).toHaveLength(
      jobs,
    );
  });
  it("forfait résilié ou tâche déjà en pause : aucune nouvelle création ni double appel", async () => {
    const f = await fixture();
    initialize(f.pid, f.input);
    accept(f.pid, "brief");
    const q = queuePreparation(
      f.pid,
      stateOf(f.pid)!.revision,
      "research",
      "generate",
      { paid: false, capMicro: 0 },
    );
    run("UPDATE jobs SET status='paused' WHERE id=?", q.job!.id);
    commitState(f.pid, stateOf(f.pid)!.revision, (n) => {
      delete n.pending;
    });
    expect(() =>
      queuePreparation(
        f.pid,
        stateOf(f.pid)!.revision,
        "research",
        "generate",
        { paid: false, capMicro: 0 },
      ),
    ).toThrow(/déjà en cours/);
    run("UPDATE subscriptions SET status='canceled' WHERE user_id=?", f.uid);
    expect(() => createQuote(f.pid, "research", "generate")).toThrow(
      /forfait actif/,
    );
  });
  it("une correction de cible conserve l’analyse existante ; les textes modifiés bloquent un devis image", async () => {
    const f = await fixture();
    initialize(f.pid, f.input);
    commitState(f.pid, stateOf(f.pid)!.revision, (s) => {
      s.stages.brief!.data.provenance = "provider";
      s.stages.brief!.data.profile.visual.description =
        "Observation conservée de la photo";
    });
    editBrief(f.pid, stateOf(f.pid)!.revision, {
      ...f.input,
      target: "Nouveau public",
    });
    expect(stateOf(f.pid)!.stages.brief!.data.profile.visual.description).toBe(
      "Observation conservée de la photo",
    );
    await finish(f.pid);
    const c = stateOf(f.pid)!.stages.content!.data.documents[0];
    saveContentVersion(
      f.pid,
      c.docKey,
      { ...c.doc, meta: { ...c.doc.meta, seoTitle: "Titre corrigé" } },
      { verdict: "PROVISIONAL" },
    );
    expect(() =>
      createQuote(
        f.pid,
        "media",
        "image",
        stateOf(f.pid)!.stages.media!.data.slots[0].key,
      ),
    ).toThrow(/texte a été modifié/);
  });
});
