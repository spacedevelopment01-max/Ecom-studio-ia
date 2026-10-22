import { describe, it, expect } from "vitest";
import { createUser } from "@/lib/auth";
import { id, now, run, one, all } from "@/lib/db";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { saveProduct, loadProject } from "@/lib/projects";
import { emptyProduct } from "@/lib/project-types";
import type { PlanId } from "@/lib/plans";
import {
  proposeStrategies,
  getStrategyState,
  prepareStrategyChange,
  activateStrategy,
  activeStrategy,
  recordStrategyContent,
  assertContentAlignment,
  assertStrategyChosen,
  strategyContext,
  stageStrategyModule,
  failStrategyPreparation,
  preparationStrategy,
} from "@/lib/marketing-strategy";
async function fixture(plan: PlanId = "dominer", service = false) {
  const user = await createUser(
    `${id()}@example.test`,
    "isolated-strategy-160",
    "Test stratégie",
  );
  const pid = id();
  const p = {
    ...emptyProduct(),
    name: service ? "Révision de violoncelle" : "Sac vélo pluie",
    summary: service
      ? "Un atelier sur rendez-vous pour contrôler le réglage de votre instrument."
      : "Un sac de transport pour les trajets à vélo, avec un compartiment de rangement.",
    category: service ? "Lutherie" : "Bagagerie",
    facts: [
      {
        key: "detail",
        label: service ? "Contrôle" : "Contenance",
        value: service ? "Réglage du chevalet" : "12 litres",
        status: "confirmed" as const,
        source: "user" as const,
      },
    ],
  };
  run(
    "INSERT INTO projects(id,user_id,name,business_type,product_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",
    pid,
    user.id,
    p.name,
    service ? "services" : "products",
    JSON.stringify(p),
    now(),
    now(),
  );
  const subscription = grantProjectPlan(pid, plan);
  return { user, pid, p, subscription };
}
function activate(pid: string, angleId: string, key = id()) {
  const p = prepareStrategyChange(pid, angleId);
  return activateStrategy(pid, {
    angleId,
    preparationId: p.id,
    idempotencyKey: key,
    confirmed: true,
  });
}
it("consulter cinq cartes ne sélectionne aucun angle ni ne dépense", async () => {
  const f = await fixture();
  const s = proposeStrategies(f.pid);
  expect(s.angles).toHaveLength(5);
  expect(s.active).toBeNull();
  expect(s.usedAngleIds).toEqual([]);
  expect(s.generalistExplanation).toContain("reste possible");
  expect(() => assertStrategyChosen(f.pid)).toThrow();
  expect(
    one<{ n: number }>(
      "SELECT COUNT(*) n FROM ai_calls WHERE project_id=?",
      f.pid,
    )?.n,
  ).toBe(0);
});
it.each([false, true])(
  "quatre motivations, situations, cibles, scènes et exemples réellement distincts, service=%s",
  async (service) => {
    const f = await fixture("dominer", service),
      s = proposeStrategies(f.pid);
    for (const key of [
      "motivation",
      "situation",
      "audience",
      "visualDirection",
      "promise",
    ] as const)
      expect(new Set(s.angles.slice(0, 4).map((a) => a[key])).size).toBe(4);
    expect(new Set(s.angles.map((a) => a.examples.hero)).size).toBe(5);
    expect(
      s.angles.every(
        (a) =>
          a.examples.advertisement.includes(f.p.name) ||
          a.examples.advertisement.includes(f.p.category),
      ),
    ).toBe(true);
    expect(s.analysis.marketSourcesVerified).toBe(false);
    expect(s.angles.every((a) => a.source === "creative_hypothesis")).toBe(
      true,
    );
    expect(s.angles[1].proofs).toContain(
      `${f.p.facts[0].label} : ${f.p.facts[0].value}`,
    );
  },
);
it("quelques précisions indispensables, sans stratégie inventée activable", async () => {
  const f = await fixture();
  saveProduct(f.pid, emptyProduct());
  const s = proposeStrategies(f.pid);
  expect(s.missingQuestions.map((q) => q.key)).toEqual(["offer", "usage"]);
  expect(() => prepareStrategyChange(f.pid, "usage")).toThrow();
  expect(activeStrategy(f.pid)).toBeNull();
});
it("49 premier choix conservé, second refusé et zéro coût", async () => {
  const f = await fixture("creer");
  activate(f.pid, "generalist");
  expect(() => activate(f.pid, "usage")).toThrow(/1 angle/);
  expect(getStrategyState(f.pid).usedAngleIds).toEqual(["generalist"]);
  expect(
    one<{ n: number }>(
      "SELECT COUNT(*) n FROM usage_events WHERE project_id=?",
      f.pid,
    )?.n,
  ).toBe(0);
});
it("89 A→B→A→B, C refusé ; généraliste compte ; renouvellement ne réinitialise rien", async () => {
  const f = await fixture("vendre");
  for (const a of ["usage", "generalist", "usage", "generalist"])
    activate(f.pid, a);
  run(
    "UPDATE subscriptions SET current_period_start=?,current_period_end=? WHERE user_id=?",
    now(),
    now() + 86400000 * 32,
    f.subscription,
  );
  expect(() => activate(f.pid, "reassurance")).toThrow(/2 angles/);
  expect(getStrategyState(f.pid).usedAngleIds.sort()).toEqual([
    "generalist",
    "usage",
  ]);
  expect(activeStrategy(f.pid)?.angleId).toBe("generalist");
});
it("129 cinq identités seulement et un seul actif", async () => {
  const f = await fixture();
  for (const a of [
    "usage",
    "reassurance",
    "expression",
    "discovery",
    "generalist",
  ])
    activate(f.pid, a);
  expect(getStrategyState(f.pid).usedAngleIds).toHaveLength(5);
  expect(() => activate(f.pid, "generalist-copy")).toThrow(/cinq/);
  expect(
    all("SELECT * FROM marketing_strategy_active WHERE project_id=?", f.pid),
  ).toHaveLength(1);
});
it("réanalyse et renommage produit ne créent aucune nouvelle identité/quota", async () => {
  const f = await fixture("vendre");
  activate(f.pid, "usage");
  const before = getStrategyState(f.pid).angles;
  saveProduct(f.pid, {
    ...loadProject(f.pid).product,
    name: "Nouveau nom client",
  });
  expect(proposeStrategies(f.pid).angles.map((a) => a.id)).toEqual(
    before.map((a) => a.id),
  );
  expect(getStrategyState(f.pid).usedAngleIds).toEqual(["usage"]);
});
it("double clic/retry transport idempotent, concurrence de préparations obsolète refusée", async () => {
  const f = await fixture("vendre"),
    a = prepareStrategyChange(f.pid, "usage"),
    b = prepareStrategyChange(f.pid, "expression"),
    key = id();
  const first = activateStrategy(f.pid, {
    angleId: "usage",
    preparationId: a.id,
    idempotencyKey: key,
    confirmed: true,
  });
  expect(
    activateStrategy(f.pid, {
      angleId: "usage",
      preparationId: a.id,
      idempotencyKey: key,
      confirmed: true,
    }).id,
  ).toBe(first.id);
  expect(
    activateStrategy(f.pid, {
      angleId: "usage",
      preparationId: a.id,
      idempotencyKey: id(),
      confirmed: true,
    }).id,
  ).toBe(first.id);
  expect(() =>
    activateStrategy(f.pid, {
      angleId: "expression",
      preparationId: b.id,
      idempotencyKey: id(),
      confirmed: true,
    }),
  ).toThrow(/changé/);
  expect(
    all("SELECT * FROM marketing_strategy_versions WHERE project_id=?", f.pid),
  ).toHaveLength(1);
});
it("vérifie forfait lors activation après préparation, sans effacer acquis", async () => {
  const f = await fixture();
  activate(f.pid, "usage");
  const prep = prepareStrategyChange(f.pid, "reassurance");
  grantProjectPlan(f.pid, "creer");
  expect(() =>
    activateStrategy(f.pid, {
      angleId: "reassurance",
      preparationId: prep.id,
      idempotencyKey: id(),
      confirmed: true,
    }),
  ).toThrow();
  expect(activeStrategy(f.pid)?.angleId).toBe("usage");
});
it("baisse et résiliation préservent angle et historique, politiques non précisées bloquées explicitement", async () => {
  const f = await fixture();
  activate(f.pid, "usage");
  activate(f.pid, "expression");
  grantProjectPlan(f.pid, "creer");
  expect(() => prepareStrategyChange(f.pid, "usage")).toThrow(
    /règle commerciale/,
  );
  expect(activeStrategy(f.pid)?.angleId).toBe("expression");
  run("UPDATE subscriptions SET status='canceled' WHERE project_id=?", f.pid);
  expect(getStrategyState(f.pid).usedAngleIds).toHaveLength(2);
  expect(() => activate(f.pid, "expression")).toThrow(/forfait actif/);
});
it("préparation erreur ou budget ne change ni version active ni quota, reprise explicite", async () => {
  const f = await fixture("vendre");
  const old = activate(f.pid, "usage"),
    prep = prepareStrategyChange(f.pid, "expression");
  failStrategyPreparation(
    f.pid,
    prep.id,
    "Budget insuffisant pour une image : aucun appel lancé.",
  );
  expect(() =>
    activateStrategy(f.pid, {
      angleId: "expression",
      preparationId: prep.id,
      idempotencyKey: id(),
      confirmed: true,
    }),
  ).toThrow(/échoué/);
  expect(activeStrategy(f.pid)?.id).toBe(old.id);
  expect(getStrategyState(f.pid).usedAngleIds).toEqual(["usage"]);
  expect(activate(f.pid, "expression").angleId).toBe("expression");
});
it("transition atomique : erreur commit de pointeur garde stratégie et quota précédents", async () => {
  const f = await fixture("vendre");
  const old = activate(f.pid, "usage"),
    prep = prepareStrategyChange(f.pid, "expression");
  expect(() =>
    activateStrategy(f.pid, {
      angleId: "expression",
      preparationId: prep.id,
      idempotencyKey: id(),
      confirmed: true,
      commitPrepared: () => {
        run(
          "UPDATE projects SET name=? WHERE id=?",
          "Ne doit pas persister",
          f.pid,
        );
        throw new Error("Sauvegarde interrompue");
      },
    }),
  ).toThrow(/interrompue/);
  expect(loadProject(f.pid).name).toBe(f.p.name);
  expect(activeStrategy(f.pid)?.id).toBe(old.id);
  expect(getStrategyState(f.pid).usedAngleIds).toEqual(["usage"]);
});
it("contenus protégés conservés et signalés non alignés, jamais faussement réétiquetés", async () => {
  const f = await fixture("vendre");
  activate(f.pid, "usage");
  recordStrategyContent(f.pid, "custom", "manual", { protected: true });
  const prep = prepareStrategyChange(f.pid, "expression");
  expect(prep.impact[0]).toMatchObject({ protected: 1, needsReview: 1 });
  expect(() =>
    activateStrategy(f.pid, {
      angleId: "expression",
      preparationId: prep.id,
      idempotencyKey: id(),
      confirmed: true,
    }),
  ).toThrow(/Préparez/);
  activateStrategy(f.pid, {
    angleId: "expression",
    preparationId: prep.id,
    idempotencyKey: id(),
    confirmed: true,
    retainUnaligned: true,
  });
  expect(getStrategyState(f.pid).alignment[0]).toMatchObject({
    protected: true,
    aligned: false,
    reason: "previous_angle",
  });
});
it("contenu non protégé doit être préparé ; réutilisation vérifiée conserve la provenance de production", async () => {
  const f = await fixture("vendre");
  const old = activate(f.pid, "usage");
  recordStrategyContent(f.pid, "custom", "compatible");
  const prep = prepareStrategyChange(f.pid, "expression");
  expect(() =>
    activateStrategy(f.pid, {
      angleId: "expression",
      preparationId: prep.id,
      idempotencyKey: id(),
      confirmed: true,
      retainUnaligned: true,
    }),
  ).toThrow(/Préparez/);
  stageStrategyModule(f.pid, prep.id, "custom", { contentIds: ["compatible"] });
  activateStrategy(f.pid, {
    angleId: "expression",
    preparationId: prep.id,
    idempotencyKey: id(),
    confirmed: true,
  });
  expect(getStrategyState(f.pid).alignment[0]).toMatchObject({
    strategyId: old.id,
    aligned: true,
  });
  expect(() =>
    assertContentAlignment(f.pid, "custom", "compatible"),
  ).not.toThrow();
});
it("snapshot préparation disponible pour moteur sans changer stratégie active", async () => {
  const f = await fixture();
  const old = activate(f.pid, "usage"),
    prep = prepareStrategyChange(f.pid, "expression");
  expect(preparationStrategy(f.pid, prep.id)).toMatchObject({
    angleId: "expression",
    activatedAt: 0,
  });
  expect(activeStrategy(f.pid)?.id).toBe(old.id);
  expect(strategyContext(f.pid)).toContain('angle="usage"');
});
it("identités et préparations isolées par projet", async () => {
  const f = await fixture(),
    g = await fixture();
  const prep = prepareStrategyChange(f.pid, "usage");
  expect(() =>
    activateStrategy(g.pid, {
      angleId: "usage",
      preparationId: prep.id,
      idempotencyKey: id(),
      confirmed: true,
    }),
  ).toThrow(/introuvable/);
  expect(getStrategyState(g.pid).usedAngleIds).toEqual([]);
});
it("ancien contenu programmé passe en revue, archives publiées préservées et envoi concurrent refuse bascule", async () => {
  const f = await fixture("vendre");
  activate(f.pid, "usage");
  for (const status of ["scheduled", "published"]) {
    const cid = id();
    run(
      "INSERT INTO posts(id,project_id,network,format,status,title,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
      cid,
      f.pid,
      "instagram",
      "image",
      status,
      "Texte acquis",
      now(),
      now(),
    );
    recordStrategyContent(f.pid, "post", cid, {
      protected: true,
      published: status === "published",
      scheduled: status === "scheduled",
    });
  }
  const prep = prepareStrategyChange(f.pid, "expression");
  activateStrategy(f.pid, {
    angleId: "expression",
    preparationId: prep.id,
    idempotencyKey: id(),
    confirmed: true,
    retainUnaligned: true,
  });
  expect(
    all<any>(
      "SELECT status,title FROM posts WHERE project_id=? ORDER BY status",
      f.pid,
    ),
  ).toEqual([
    { status: "published", title: "Texte acquis" },
    { status: "review", title: "Texte acquis" },
  ]);
  run(
    "UPDATE posts SET status='publishing' WHERE project_id=? AND status='review'",
    f.pid,
  );
  expect(() => activate(f.pid, "usage")).toThrow(/en cours/);
});
it("nouvelle donnée produit invalide la compatibilité sans supprimer les versions", async () => {
  const f = await fixture();
  activate(f.pid, "usage");
  recordStrategyContent(f.pid, "custom", "piece");
  expect(() => assertContentAlignment(f.pid, "custom", "piece")).not.toThrow();
  saveProduct(f.pid, {
    ...loadProject(f.pid).product,
    summary: "Le sac a désormais deux compartiments confirmés.",
  });
  expect(() => assertContentAlignment(f.pid, "custom", "piece")).toThrow(
    /pas été vérifié/,
  );
  expect(getStrategyState(f.pid).alignment[0].reason).toBe("project_changed");
});
it("vérifier un contenu ne couvre pas les autres éléments du module ; remplacement explicite", async () => {
  const f = await fixture("vendre");
  activate(f.pid, "usage");
  recordStrategyContent(f.pid, "custom", "one");
  recordStrategyContent(f.pid, "custom", "two");
  const prep = prepareStrategyChange(f.pid, "expression");
  stageStrategyModule(f.pid, prep.id, "custom", { contentIds: ["one"] });
  expect(() =>
    activateStrategy(f.pid, {
      angleId: "expression",
      preparationId: prep.id,
      idempotencyKey: id(),
      confirmed: true,
    }),
  ).toThrow(/Préparez/);
  recordStrategyContent(f.pid, "custom", "two-new", {
    strategy: preparationStrategy(f.pid, prep.id),
  });
  stageStrategyModule(f.pid, prep.id, "custom", {
    contentIds: ["two-new"],
    replacements: [{ oldId: "two", newId: "two-new" }],
  });
  expect(
    activateStrategy(f.pid, {
      angleId: "expression",
      preparationId: prep.id,
      idempotencyKey: id(),
      confirmed: true,
    }).angleId,
  ).toBe("expression");
});
it("acquis ajouté pendant préparation force révision impact, sans consommation de quota", async () => {
  const f = await fixture("vendre");
  activate(f.pid, "usage");
  const prep = prepareStrategyChange(f.pid, "expression");
  recordStrategyContent(f.pid, "custom", "concurrent");
  expect(() =>
    activateStrategy(f.pid, {
      angleId: "expression",
      preparationId: prep.id,
      idempotencyKey: id(),
      confirmed: true,
    }),
  ).toThrow(/nouveaux contenus/);
  expect(getStrategyState(f.pid).usedAngleIds).toEqual(["usage"]);
});
it("réanalyse réconcilie les nouveaux faits sans changer les identités ni le snapshot actif", async () => {
  const f = await fixture("vendre");
  const old = activate(f.pid, "usage");
  saveProduct(f.pid, {
    ...loadProject(f.pid).product,
    name: "Sac Rivage",
    facts: [
      {
        key: "capacity",
        label: "Contenance",
        value: "18 litres",
        status: "confirmed",
        source: "user",
      },
    ],
  });
  const updated = proposeStrategies(f.pid);
  expect(updated.angles[1].proofs).toContain("Contenance : 18 litres");
  expect(updated.angles.map((a) => a.id)).toEqual([
    "usage",
    "reassurance",
    "expression",
    "discovery",
    "generalist",
  ]);
  expect(activeStrategy(f.pid)?.angle.examples.hero).toBe(
    old.angle.examples.hero,
  );
  expect(updated.usedAngleIds).toEqual(["usage"]);
});
it("conserver volontairement après compatibilité retire la validation, choix inverse la rétablit", async () => {
  const f = await fixture("vendre");
  activate(f.pid, "usage");
  recordStrategyContent(f.pid, "custom", "keep");
  const prep = prepareStrategyChange(f.pid, "expression");
  stageStrategyModule(f.pid, prep.id, "custom", { contentIds: ["keep"] });
  stageStrategyModule(f.pid, prep.id, "custom", {
    contentIds: [],
    retainedContentIds: ["keep"],
  });
  activateStrategy(f.pid, {
    angleId: "expression",
    preparationId: prep.id,
    idempotencyKey: id(),
    confirmed: true,
  });
  expect(getStrategyState(f.pid).alignment[0].aligned).toBe(false);
});
it("bascule vers angle déjà utilisé réutilise une compatibilité vérifiée sans réétiqueter sa production", async () => {
  const f = await fixture("vendre");
  activate(f.pid, "usage");
  recordStrategyContent(f.pid, "custom", "old", { strategy: null });
  let prep = prepareStrategyChange(f.pid, "usage");
  stageStrategyModule(f.pid, prep.id, "custom", { contentIds: ["old"] });
  activateStrategy(f.pid, {
    angleId: "usage",
    preparationId: prep.id,
    idempotencyKey: id(),
    confirmed: true,
  });
  prep = prepareStrategyChange(f.pid, "expression");
  stageStrategyModule(f.pid, prep.id, "custom", {
    contentIds: [],
    retainedContentIds: ["old"],
  });
  activateStrategy(f.pid, {
    angleId: "expression",
    preparationId: prep.id,
    idempotencyKey: id(),
    confirmed: true,
  });
  const back = prepareStrategyChange(f.pid, "usage");
  expect(back.contents[0].aligned).toBe(true);
  activateStrategy(f.pid, {
    angleId: "usage",
    preparationId: back.id,
    idempotencyKey: id(),
    confirmed: true,
  });
  expect(getStrategyState(f.pid).alignment[0]).toMatchObject({
    strategyId: null,
    aligned: true,
  });
});
it("consigne de vocabulaire invalide les acquis et reste appliquée aux nouvelles cartes", async () => {
  const f = await fixture();
  const { addWordingRule } = await import("@/lib/client-wording");
  activate(f.pid, "usage");
  recordStrategyContent(f.pid, "custom", "avant");
  addWordingRule(f.pid, { avoid: "sac", use: "bagage" });
  expect(getStrategyState(f.pid).alignment[0]).toMatchObject({
    aligned: false,
    reason: "project_changed",
  });
  expect(proposeStrategies(f.pid).angles[0].examples.hero).not.toMatch(/sac/i);
});
it.each([
  {
    name: "Moulin de poche",
    category: "Préparation du café",
    summary: "Un moulin manuel pour préparer du café lors des déplacements.",
    label: "Usage",
    value: "Les départs en train avec du café en grains",
  },
  {
    name: "Bilan de jardin",
    category: "Conseil paysager",
    summary: "Une visite pour organiser les espaces d’un jardin existant.",
    label: "Usage",
    value: "Réorganiser un jardin avant les plantations de printemps",
  },
])(
  "cas nouveau $category : les usages réels et non les slogans de démo guident les motivations",
  async (data) => {
    const f = await fixture("dominer", data.category === "Conseil paysager");
    saveProduct(f.pid, {
      ...loadProject(f.pid).product,
      name: data.name,
      category: data.category,
      summary: data.summary,
      facts: [
        {
          key: "use",
          label: data.label,
          value: data.value,
          status: "confirmed",
          source: "user",
        },
      ],
    });
    const s = proposeStrategies(f.pid);
    expect(s.angles[0].situation).toContain(data.value);
    expect(s.angles[0].motivation).toContain(data.value);
    expect(s.angles[2].audience).toContain(data.category);
    expect(s.angles[3].audience).toContain(data.category);
    expect(
      s.angles.every(
        (a) =>
          a.examples.subtext.includes(data.name) ||
          a.examples.subtext.includes(data.summary) ||
          a.examples.subtext.includes(data.value),
      ),
    ).toBe(true);
  },
);
it("seule la direction de composition change : données stratégiques et compatibilité restent identiques", async () => {
  const f = await fixture();
  const { localBrand } = await import("@/lib/engine/local");
  const { saveBrand } = await import("@/lib/projects");
  const brand = localBrand(f.p, f.p.name).brand;
  saveBrand(f.pid, brand);
  activate(f.pid, "usage");
  recordStrategyContent(f.pid, "custom", "kept");
  saveBrand(f.pid, {
    ...brand,
    direction: "noctil",
    paletteMode: "client",
    generatedBy: "ai",
  });
  expect(() => assertContentAlignment(f.pid, "custom", "kept")).not.toThrow();
  saveBrand(f.pid, { ...brand, name: "Une autre identité" });
  expect(() => assertContentAlignment(f.pid, "custom", "kept")).toThrow();
});
it("un média supprimé après préparation ne peut pas être déclaré vérifié", async () => {
  const f = await fixture();
  activate(f.pid, "usage");
  const asset = id();
  run(
    "INSERT INTO assets(id,project_id,user_id,name,kind,mime,size,storage_key,origin,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
    asset,
    f.pid,
    f.user.id,
    "test.jpg",
    "image",
    "image/jpeg",
    1,
    "test.jpg",
    "generated",
    now(),
  );
  recordStrategyContent(f.pid, "asset", asset);
  const prep = prepareStrategyChange(f.pid, "expression");
  stageStrategyModule(f.pid, prep.id, "asset", { contentIds: [asset] });
  run("UPDATE assets SET deleted_at=? WHERE id=?", now(), asset);
  expect(() =>
    activateStrategy(f.pid, {
      angleId: "expression",
      preparationId: prep.id,
      idempotencyKey: id(),
      confirmed: true,
    }),
  ).toThrow(/supprimée/);
  expect(activeStrategy(f.pid)?.angleId).toBe("usage");
});
it("thème préparé conserve les retouches sous avertissement non aligné, malgré son nouveau stamp", async () => {
  const f = await fixture();
  const active = activate(f.pid, "usage");
  const tid = id();
  run(
    "INSERT INTO theme_versions(id,project_id,number,spec,author,created_at) VALUES(?,?,?,?,?,?)",
    tid,
    f.pid,
    1,
    JSON.stringify({
      meta: {
        strategy: {
          retainedPaths: ["templates.index.sections.hero.settings.heading"],
          alignment: "mixed",
        },
      },
    }),
    "system",
    now(),
  );
  run("UPDATE projects SET current_theme_version_id=? WHERE id=?", tid, f.pid);
  recordStrategyContent(f.pid, "theme", tid, { strategy: active });
  expect(getStrategyState(f.pid).alignment[0]).toMatchObject({
    protected: true,
    aligned: false,
    reason: "protected_unreviewed",
  });
});
it("cartes en anglais, mêmes cinq identités, faits client inchangés et exemples distincts", async () => {
  const f = await fixture();
  const { saveSettings } = await import("@/lib/projects");
  saveSettings(f.pid, { ...loadProject(f.pid).settings, language: "en" });
  const s = proposeStrategies(f.pid);
  expect(s.angles.map((a) => a.id)).toEqual([
    "usage",
    "reassurance",
    "expression",
    "discovery",
    "generalist",
  ]);
  expect(s.angles[4].title).toBe("Generalist");
  expect(s.generalistExplanation).toContain(
    "general approach remains possible",
  );
  expect(s.angles[0].examples.hero).toBe(`Make room for ${f.p.name}.`);
  expect(s.angles[1].proofs).toContain("Contenance: 12 litres");
  expect(new Set(s.angles.slice(0, 4).map((a) => a.motivation)).size).toBe(4);
  expect(s.angles[2].examples.advertisement).toContain("your own world");
});
it("un média rejeté conservé en historique ne bloque pas le changement du contenu courant", async () => {
  const f = await fixture();
  activate(f.pid, "usage");
  const aid = id();
  run(
    "INSERT INTO assets(id,project_id,user_id,name,kind,mime,size,storage_key,origin,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    aid,
    f.pid,
    f.user.id,
    "rejected.jpg",
    "image",
    "image/jpeg",
    1,
    "rejected.jpg",
    "generated",
    "rejected",
    now(),
  );
  recordStrategyContent(f.pid, "asset", aid);
  expect(
    prepareStrategyChange(f.pid, "expression").contents.some(
      (c) => c.contentId === aid,
    ),
  ).toBe(false);
  expect(activate(f.pid, "expression").angleId).toBe("expression");
  expect(one("SELECT id FROM assets WHERE id=?", aid)).toBeTruthy();
});

it('une réanalyse ne transforme pas un angle activé en une autre cible sans consommer un nouveau droit', async () => {
 const {clientFixture}=await import('./mission154-fixtures');const f=await clientFixture({strategy:null,incomplete:true});
 const before=getStrategyState(f.pid);const p=prepareStrategyChange(f.pid,'usage');activateStrategy(f.pid,{angleId:'usage',preparationId:p.id,idempotencyKey:'fixed-target-160',confirmed:true,retainUnaligned:true});
 const {loadProject,saveBrand}=await import('@/lib/projects');const project=loadProject(f.pid);saveBrand(f.pid,{...project.brand!,audience:'Une nouvelle cible arbitraire obtenue par réanalyse'});
 const after=proposeStrategies(f.pid);expect(after.angles.map(a=>a.audience)).toEqual(before.angles.map(a=>a.audience));expect(after.usedAngleIds).toEqual(['usage']);
});
