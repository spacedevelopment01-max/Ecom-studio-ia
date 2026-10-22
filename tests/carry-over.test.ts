/**
 * Préservation des retouches et ajouts du client lors d'un changement de thème ou d'un nouveau remplissage
 * (mission du 19 octobre, issue #137, §4 et §5) : report des sections ajoutées, masquage des incompatibles, réglages
 * réappliqués, conflits signalés (valeur du client gardée), compte rendu lisible.
 */
import { describe, expect, it } from "vitest";
import { applyOps } from "../src/lib/theme/ops";
import { carryOver, describeReport, manualEdits, preservation, preserve, reapplyEdits, userAdditions } from "../src/lib/theme/carry-over";
import type { ThemeSpec } from "../src/lib/theme/spec";
import { sampleSpec } from "./fixtures";
import { runWithLang } from "../src/lib/i18n-server";

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

describe("Préservation des retouches du client", () => {
  const baseline = sampleSpec("vitrine");
  const firstId = baseline.templates.index.order[0];
  // Le client : ajoute une FAQ, une section « conversion » (profil activé sur sa version), change un titre et masque une section.
  const withProfile = { ...baseline, settings: { ...baseline.settings, conversion_profile: "pop" } } as ThemeSpec;
  const edited = fr(() => applyOps(withProfile, [
    { op: "add_section", template: "index", type: "faq" },
    { op: "add_section", template: "index", type: "cv-guarantee" },
    { op: "set_setting", template: "index", section: firstId, key: "heading", value: "Mon titre à moi" },
  ], { storeKind: "specialty" })).spec;
  const second = baseline.templates.index.order[1];
  edited.templates.index.sections[second].disabled = true;

  it("reconnaît les ajouts et les réglages modifiés par rapport à la composition automatique", () => {
    const adds = userAdditions(baseline, edited);
    expect(adds.map((a) => a.section.type).sort()).toEqual(["cv-guarantee", "faq"]);
    const edits = manualEdits(baseline, edited);
    expect(edits.some((e) => e.id === firstId && e.key === "heading" && e.value === "Mon titre à moi")).toBe(true);
    expect(edits.some((e) => e.id === second && e.key === "@disabled" && e.value === true)).toBe(true);
  });

  it("changement de thème : ajouts reportés, section incompatible gardée masquée avec motif, réglages réappliqués", () => {
    const fresh = sampleSpec("manifeste"); // autre thème, sans profil « conversion »
    const r = preserve(fresh, preservation(baseline, edited), baseline, "specialty", "fr");
    const types = r.spec.templates.index.order.map((id) => r.spec.templates.index.sections[id]);
    const faq = types.find((s) => s.type === "faq"), guarantee = types.find((s) => s.type === "cv-guarantee");
    expect(faq && !faq.disabled).toBe(true);
    expect(guarantee?.disabled).toBe(true);
    expect(r.report.kept.map((x) => x.type)).toEqual(["faq"]);
    expect(r.report.hidden.map((x) => x.type)).toEqual(["cv-guarantee"]);
    expect(r.report.hidden[0].reason).toMatch(/fraise, sillon/);
    // Les identifiants diffèrent entre deux thèmes : le titre modifié n'a pas d'équivalent → signalé « sans équivalent », pas perdu en silence.
    expect(r.report.dropped.length + r.report.reapplied.length).toBeGreaterThan(0);
    const text = describeReport(r.report, "fr");
    expect(text).toMatch(/1 section du client reportée/);
    expect(text).toMatch(/incompatible/);
  });

  it("nouveau remplissage du même thème : réglages réappliqués, conflit signalé et valeur du client gardée", () => {
    const fresh = sampleSpec("vitrine");
    // Le remplissage automatique propose un autre titre pour la même section : conflit.
    fresh.templates.index.sections[firstId].settings.heading = "Nouveau titre automatique";
    const r = preserve(fresh, preservation(baseline, edited), baseline, "specialty", "fr");
    expect(r.spec.templates.index.sections[firstId].settings.heading).toBe("Mon titre à moi");
    expect(r.report.conflicts).toEqual([{ template: "index", id: firstId, key: "heading", kept: "Mon titre à moi", proposed: "Nouveau titre automatique" }]);
    expect(r.spec.templates.index.sections[second].disabled).toBe(true);
    expect(r.report.reapplied.some((x) => x.key === "@disabled")).toBe(true);
    expect(describeReport(r.report, "en")).toMatch(/conflict/);
    // Même thème, profil « conversion » absent de la composition fraîche : la garantie est reportée masquée, la FAQ visible.
    expect(r.report.kept.map((x) => x.type)).toEqual(["faq"]);
    expect(r.report.hidden.map((x) => x.type)).toEqual(["cv-guarantee"]);
  });

  it("sans version composée de référence, rien n'est reporté ni inventé ; un ajout identique ne crée pas de doublon d'identifiant", () => {
    expect(preservation(null, edited)).toEqual({ additions: [], edits: [] });
    const fresh = sampleSpec("vitrine");
    const adds = userAdditions(baseline, edited);
    const once = carryOver(fresh, adds, "specialty", "fr");
    const twice = carryOver(once.spec, adds, "specialty", "fr");
    const ids = twice.spec.templates.index.order;
    expect(new Set(ids).size).toBe(ids.length);
    const r = reapplyEdits(fresh, [{ template: "index", id: "inexistante", type: "faq", key: "heading", value: "x", before: "y" }], baseline);
    expect(r.report.dropped).toHaveLength(1);
  });
});
