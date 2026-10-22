import { strategyVisibilitySql, strategyContentVisible } from "./visibility";
/** Persistent project-wide angle identities and atomic activation. No supplier, payment or publishing here. */
import { createHash } from "node:crypto";
import { db, all, one, run, id, now, json, tx } from "../db";
import { loadProject } from "../projects";
import { PLANS } from "../plans";
import { projectPlan } from "../project-billing";
import { HttpError } from "../auth";
import { canonicalJSON } from "../brain/hash";
import {
  buildAngles,
  proposalAnalysis,
  inputDigest,
  GENERALIST_EXPLANATION,
  GENERALIST_EXPLANATION_EN,
} from "./proposals";
import {
  ANGLE_IDS,
  type AngleId,
  type ActiveStrategy,
  type MarketingAngle,
  type StrategyContent,
  type StrategyImpact,
  type StrategyPreparation,
  type StrategyState,
} from "./types";
export * from "./types";
export { GENERALIST_EXPLANATION } from "./proposals";
const hash = (v: unknown) =>
  createHash("sha256").update(canonicalJSON(v)).digest("hex");
const installed = new WeakSet<object>();
function schema() {
  const d = db();
  if (installed.has(d)) return;
  d.exec(`
 CREATE TABLE IF NOT EXISTS marketing_strategy_sets(project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE, angles_json TEXT NOT NULL, analysis_json TEXT NOT NULL, input_digest TEXT NOT NULL, created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS marketing_strategy_versions(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,version INTEGER NOT NULL,angle_id TEXT NOT NULL,angle_json TEXT NOT NULL,input_digest TEXT NOT NULL,activated_at INTEGER NOT NULL,UNIQUE(project_id,version));
 CREATE TABLE IF NOT EXISTS marketing_strategy_active(project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,strategy_id TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS marketing_strategy_used(project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,angle_id TEXT NOT NULL,first_activated_at INTEGER NOT NULL,PRIMARY KEY(project_id,angle_id));
 CREATE TABLE IF NOT EXISTS marketing_strategy_preparations(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,angle_id TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS marketing_strategy_requests(project_id TEXT NOT NULL,idempotency_key TEXT NOT NULL,angle_id TEXT NOT NULL,strategy_id TEXT NOT NULL,PRIMARY KEY(project_id,idempotency_key));
 CREATE TABLE IF NOT EXISTS marketing_strategy_contents(project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,module TEXT NOT NULL,content_id TEXT NOT NULL,strategy_id TEXT,version INTEGER,angle_id TEXT,input_digest TEXT NOT NULL,protected INTEGER NOT NULL DEFAULT 0,published INTEGER NOT NULL DEFAULT 0,scheduled INTEGER NOT NULL DEFAULT 0,content_fingerprint TEXT NOT NULL DEFAULT '',PRIMARY KEY(project_id,module,content_id));
 CREATE TABLE IF NOT EXISTS marketing_strategy_archives(project_id TEXT NOT NULL,module TEXT NOT NULL,content_id TEXT NOT NULL,replaced_by TEXT NOT NULL,PRIMARY KEY(project_id,module,content_id));
 CREATE TABLE IF NOT EXISTS marketing_strategy_staging(preparation_id TEXT NOT NULL,module TEXT NOT NULL,content_ids TEXT NOT NULL,retained_ids TEXT NOT NULL,replacements_json TEXT NOT NULL DEFAULT '[]',PRIMARY KEY(preparation_id,module));
 CREATE TABLE IF NOT EXISTS marketing_strategy_reviews(project_id TEXT NOT NULL,module TEXT NOT NULL,content_id TEXT NOT NULL,strategy_id TEXT NOT NULL,input_digest TEXT NOT NULL,content_fingerprint TEXT NOT NULL DEFAULT '',PRIMARY KEY(project_id,module,content_id,strategy_id));
 `);
  for(const table of ['marketing_strategy_contents','marketing_strategy_reviews'])if(!(d.prepare(`PRAGMA table_info(${table})`).all() as {name:string}[]).some(c=>c.name==='content_fingerprint'))d.exec(`ALTER TABLE ${table} ADD COLUMN content_fingerprint TEXT NOT NULL DEFAULT ''`);
  installed.add(d);
}
function version(row: any): ActiveStrategy | null {
  return row
    ? {
        id: row.id,
        projectId: row.project_id,
        version: row.version,
        angleId: row.angle_id,
        angle: JSON.parse(row.angle_json),
        inputDigest: row.input_digest,
        activatedAt: row.activated_at,
      }
    : null;
}
export function activeStrategy(projectId: string): ActiveStrategy | null {
  schema();
  return version(
    one(
      "SELECT v.* FROM marketing_strategy_active a JOIN marketing_strategy_versions v ON v.id=a.strategy_id WHERE a.project_id=?",
      projectId,
    ),
  );
}
/** Service websites have a common factual foundation, independent of communication angles. */
export function serviceStrategyProject(projectId:string):boolean {return one<{business_type:string}>('SELECT business_type FROM projects WHERE id=?',projectId)?.business_type==='services';}
export function defaultStrategy(projectId:string):ActiveStrategy|null {
 schema();return version(one("SELECT v.* FROM projects p JOIN marketing_strategy_active a ON a.project_id=p.id JOIN marketing_strategy_versions v ON v.id=a.strategy_id WHERE p.id=? AND p.business_type!='services'",projectId));
}
/** Resolve an already explicitly authorized communication identity; never consumes another slot. */
export function communicationStrategy(projectId:string,options:{angleId?:string;strategyId?:string}={}):ActiveStrategy {
 schema();const s=options.strategyId?version(one('SELECT * FROM marketing_strategy_versions WHERE project_id=? AND id=?',projectId,options.strategyId)):options.angleId?version(one('SELECT * FROM marketing_strategy_versions WHERE project_id=? AND angle_id=? ORDER BY version DESC LIMIT 1',projectId,canonicalAngle(options.angleId))):activeStrategy(projectId);
 if(!s||!one('SELECT 1 FROM marketing_strategy_used WHERE project_id=? AND angle_id=?',projectId,s.angleId))throw new HttpError(409,'Choisissez explicitement un angle autorisé dans Stratégie avant de créer cette communication.','strategy_communication_choice_required');
 quota(projectId,s.angleId);
 if(s.inputDigest!==currentStrategyInputDigest(projectId))throw new HttpError(409,'Les informations ont changé. Réconciliez cet angle avant de créer une nouvelle communication ; les versions acquises sont conservées.','strategy_inputs_stale');
 return s;
}
export const currentStrategyInputDigest = (projectId: string): string =>
  inputDigest(loadProject(projectId));
export function strategyContext(projectId: string): string {
  return strategyContextFor(activeStrategy(projectId));
}
export function strategyContextFor(s: ActiveStrategy | null): string {
  return s
    ? `\n<strategie_marketing_active version="${s.version}" id="${s.id}" angle="${s.angleId}">\n${JSON.stringify(s.angle)}\nCette stratégie est le fil conducteur de cette création et de ses déclinaisons. La portée du moteur reste conservée : un angle de communication de services ne réécrit pas le site général. Les cibles et motivations sont des hypothèses créatives, jamais des personnes ou résultats validés. Préserver les faits, le nom, le logo, les retouches et l’identité. Varier les textes par rôle sans répéter le slogan. Aucun fait nouveau, marque externe ou humain sans autorisation.\n</strategie_marketing_active>`
    : "";
}
export function assertStrategyChosen(projectId: string) {
  if (!serviceStrategyProject(projectId) && !activeStrategy(projectId))
    throw new HttpError(
      409,
      "Choisissez explicitement un angle marketing avant de construire votre thème. Les cinq propositions et les démonstrations restent consultables sans activation.",
      "strategy_choice_required",
    );
}
function canonicalAngle(value: string): AngleId {
  if (!(ANGLE_IDS as readonly string[]).includes(value))
    throw new HttpError(
      400,
      "Cet angle ne fait pas partie des cinq propositions du projet.",
      "strategy_angle_unknown",
    );
  return value as AngleId;
}
function quota(projectId: string, angleId: AngleId) {
  const plan = projectPlan(projectId);
  if (!plan)
    throw new HttpError(
      402,
      "Le projet doit disposer de son forfait actif pour activer un angle.",
      "plan_required",
    );
  const used = all<{ angle_id: AngleId }>(
    "SELECT angle_id FROM marketing_strategy_used WHERE project_id=?",
    projectId,
  ).map((r) => r.angle_id);
  const limit = PLANS[plan].marketingAngles;
  const active = activeStrategy(projectId);
  // No commercial reset on renewal or replacement subscription. Unspecified downgrade switching is frozen, history retained.
  if (active?.angleId === angleId) return { plan, limit, used };
  if (used.length > limit)
    throw new HttpError(
      409,
      "Votre historique d’angles et votre angle actif sont préservés. La bascule après baisse de forfait nécessite une règle commerciale validée ; aucun historique n’est effacé.",
      "strategy_plan_transition_review",
    );
  if (!used.includes(angleId) && used.length >= limit)
    throw new HttpError(
      402,
      `Ce forfait permet ${limit} angle${limit > 1 ? "s" : ""} distinct${limit > 1 ? "s" : ""} sur la durée du forfait. Le renouvellement ne remet pas ce choix à zéro.`,
      "strategy_angle_limit",
    );
  return { plan, limit, used };
}
function proposalSet(projectId: string) {
  schema();
  const p = loadProject(projectId),
    a = proposalAnalysis(p),
    digest = inputDigest(p);
  let set = one<any>(
    "SELECT * FROM marketing_strategy_sets WHERE project_id=?",
    projectId,
  );
  if (!set) {
    const analysis = {
      method: "local_project_evidence",
      inputDigest: digest,
      sources: a.sources,
      marketSourcesVerified: false,
      limits: a.limits,
    };
    run(
      "INSERT OR IGNORE INTO marketing_strategy_sets VALUES(?,?,?,?,?)",
      projectId,
      JSON.stringify(buildAngles(p)),
      JSON.stringify(analysis),
      digest,
      now(),
    );
    set = one(
      "SELECT * FROM marketing_strategy_sets WHERE project_id=?",
      projectId,
    );
  } else if (set.input_digest !== digest) {
    const original=json<MarketingAngle[]>(set.angles_json,[]);
    const activated=!!one('SELECT 1 FROM marketing_strategy_used WHERE project_id=? LIMIT 1',projectId);
    // Updating facts is allowed; recalculation must not turn an activated identity into a new target/motivation.
    const reconciled=buildAngles(p).map(fresh=>{const old=original.find(a=>a.id===fresh.id);return !activated||!old?fresh:{...fresh,title:old.title,audience:old.audience,situation:old.situation,notPriority:old.notPriority,tension:old.tension,motivation:old.motivation,tone:old.tone};});
    const analysis = {
      method: "local_project_evidence",
      inputDigest: digest,
      sources: a.sources,
      marketSourcesVerified: false,
      limits: a.limits,
    };
    run(
      "UPDATE marketing_strategy_sets SET angles_json=?,analysis_json=?,input_digest=? WHERE project_id=?",
      JSON.stringify(reconciled),
      JSON.stringify(analysis),
      digest,
      projectId,
    );
    set = one(
      "SELECT * FROM marketing_strategy_sets WHERE project_id=?",
      projectId,
    );
  }
  return { p, a, digest, set };
}
/** Reanalysis reconciles facts within the same five stable motivations; activated snapshots and quota history remain immutable. */
export function proposeStrategies(projectId: string): StrategyState {
  const { p, a, digest } = proposalSet(projectId);
  const used = all<{ angle_id: string }>(
    "SELECT angle_id FROM marketing_strategy_used WHERE project_id=?",
    projectId,
  );
  if (!used.length) {
    run(
      "UPDATE marketing_strategy_sets SET angles_json=?,analysis_json=?,input_digest=? WHERE project_id=?",
      JSON.stringify(buildAngles(p)),
      JSON.stringify({
        method: "local_project_evidence",
        inputDigest: digest,
        sources: a.sources,
        marketSourcesVerified: false,
        limits: a.limits,
      }),
      digest,
      projectId,
    );
  }
  return getStrategyState(projectId);
}
/** Mutable native records need a content identity as well as a stable database ID. */
function contentFingerprint(projectId:string,module:string,contentId:string):string {
 const tables:Record<string,{table:string;keys:string[]}>= {
  post:{table:'posts',keys:['title','caption','hashtags','link','media','brief']},
  blog:{table:'blog_articles',keys:['title','body_html','excerpt','meta_title','meta_description']},
  campaign:{table:'campaigns',keys:['name','objective','networks','brief','plan']},
  calendar:{table:'content_plans',keys:['params','strategy']},
 };
 const def=tables[module];if(!def)return '';const row=one<Record<string,unknown>>(`SELECT * FROM ${def.table} WHERE project_id=? AND id=?`,projectId,contentId);return row?hash(Object.fromEntries(def.keys.map(k=>[k,row[k]??null]))):'';
}
function producedRows(projectId: string) {
  return all<any>(
    "SELECT * FROM marketing_strategy_contents WHERE project_id=?",
    projectId,
  );
}
/** Existing native contents are inventoried read-only: absence of a stamp is never proof of alignment. */
function nativeInventory(projectId: string): {
  module: string;
  contentId: string;
  protected: boolean;
  published: boolean;
  scheduled: boolean;
  unreviewed?: boolean;
  retainedPaths?: string[];
}[] {
  const items: {
    module: string;
    contentId: string;
    protected: boolean;
    published: boolean;
    scheduled: boolean;
    unreviewed?: boolean;
    retainedPaths?: string[];
  }[] = [];
  const add = (
    module: string,
    rows: any[],
    manual: (r: any) => boolean,
    pub: (r: any) => boolean = () => false,
    sched: (r: any) => boolean = () => false,
  ) =>
    rows.forEach((r) =>
      items.push({
        module,
        contentId: r.id,
        protected: manual(r),
        published: pub(r),
        scheduled: sched(r),
        ...(module === "theme"
          ? {
              unreviewed: !!json<any>(r.spec, {}).meta?.strategy?.retainedPaths
                ?.length,
              retainedPaths:
                json<any>(r.spec, {}).meta?.strategy?.retainedPaths ?? [],
            }
          : {}),
      }),
    );
  // User-authored upstream copy is protected independently of a theme. Its identity changes on edit.
  const manualCopy=one<{id:string;value:string}>("SELECT id,value FROM memory WHERE project_id=? AND kind='artifact' AND key='shop_copy' AND source='user'",projectId);
  if(manualCopy)items.push({module:'copy',contentId:`${manualCopy.id}:${createHash('sha256').update(manualCopy.value).digest('hex').slice(0,16)}`,protected:true,published:false,scheduled:false});
  add(
    "theme",
    all(
      "SELECT v.id,v.author,v.spec FROM projects p JOIN theme_versions v ON v.id=p.current_theme_version_id WHERE p.id=?",
      projectId,
    ),
    (r) => r.author === "user",
  );
  add(
    "asset",
    all(
      "SELECT id,origin,role FROM assets WHERE project_id=? AND kind IN ('image','video') AND deleted_at IS NULL AND status!='rejected' AND COALESCE(role,'') NOT IN ('export','original','logo','brand-board','identity-board')",
      projectId,
    ),
    (r) => r.origin === "upload",
  );
  add(
    "seo",
    all(
      `SELECT c.id,c.source FROM content_documents c WHERE c.project_id=? AND c.version=(SELECT MAX(n.version) FROM content_documents n WHERE n.project_id=c.project_id AND n.doc_key=c.doc_key AND ${strategyVisibilitySql(projectId,"seo","n.id",true)})`,
      projectId,
    ),
    (r) => r.source !== "engine",
  );
  add(
    "video",
    all(
      `SELECT c.id,c.source FROM video_documents c WHERE c.project_id=? AND c.version=(SELECT MAX(n.version) FROM video_documents n WHERE n.project_id=c.project_id AND n.doc_key=c.doc_key AND ${strategyVisibilitySql(projectId,"video","n.id",true)})`,
      projectId,
    ),
    (r) => r.source === "user",
  );
  add(
    "ad",
    all(
      `SELECT c.id,c.source FROM ad_documents c WHERE c.project_id=? AND c.version=(SELECT MAX(n.version) FROM ad_documents n WHERE n.project_id=c.project_id AND n.doc_key=c.doc_key AND ${strategyVisibilitySql(projectId,"ad","n.id",true)})`,
      projectId,
    ),
    (r) => r.source === "user",
  );
  add(
    "post",
    all(
      "SELECT id,status,approved_by FROM posts WHERE project_id=? AND status NOT IN ('cancelled','failed')",
      projectId,
    ),
    (r) => !!r.approved_by,
    (r) => r.status === "published",
    (r) => ["scheduled", "publishing"].includes(r.status),
  );
  add(
    "blog",
    all(
      "SELECT id,status FROM blog_articles WHERE project_id=? AND deleted_at IS NULL",
      projectId,
    ),
    (r) => !one("SELECT 1 FROM marketing_strategy_contents WHERE project_id=? AND module='blog' AND content_id=? AND content_fingerprint!=''",projectId,r.id),
    (r) => r.status === "published",
  );
  add(
    "campaign",
    all(
      "SELECT id,status FROM campaigns WHERE project_id=? AND status NOT IN ('cancelled','archived')",
      projectId,
    ),
    () => true,
    (r) => r.status === "active",
  );
  add(
    "calendar",
    all(
      "SELECT id FROM content_plans WHERE project_id=? AND status NOT IN ('cancelled','archived')",
      projectId,
    ),
    () => false,
  );
  return items.filter(c=>strategyContentVisible(projectId,c.module,c.contentId,true));
}
function inventory(
  projectId: string,
  target: ActiveStrategy | null = activeStrategy(projectId),
): StrategyContent[] {
  schema();
  const digest = inputDigest(loadProject(projectId));
  const stamped = producedRows(projectId);
  const natives = nativeInventory(projectId);
  const nativeKeys = new Set(natives.map((c) => `${c.module}:${c.contentId}`));
  // Only latest native versions, plus module records unknown to the old schema. Historical native versions remain in the ledger, not in the current impact.
  const nativeModules = new Set([
    "theme",
    "copy",
    "asset",
    "seo",
    "video",
    "ad",
    "post",
    "blog",
    "campaign",
    "calendar",
  ]);
  const rows = [
    ...natives,
    ...stamped
      .filter(
        (c) =>
          !nativeModules.has(c.module) &&
          !nativeKeys.has(`${c.module}:${c.content_id}`),
      )
      .map((c) => ({
        module: c.module,
        contentId: c.content_id,
        protected: !!c.protected,
        published: !!c.published,
        scheduled: !!c.scheduled,
      })),
  ];
  return rows.map((c) => {
    const r = stamped.find(
      (s) => s.module === c.module && s.content_id === c.contentId,
    );
    const fingerprint=contentFingerprint(projectId,c.module,c.contentId);
    const contentChanged=!!fingerprint&&!!r&&r.content_fingerprint!==fingerprint;
    const review =
      target &&
      one(
        "SELECT 1 FROM marketing_strategy_reviews r LEFT JOIN marketing_strategy_versions v ON v.id=r.strategy_id WHERE r.project_id=? AND r.module=? AND r.content_id=? AND r.input_digest=? AND r.content_fingerprint=? AND (r.strategy_id=? OR (v.angle_id=? AND v.input_digest=?))",
        projectId,
        c.module,
        c.contentId,
        digest,
        fingerprint,
        target.id,
        target.angleId,
        digest,
      );
    const unreviewed = "unreviewed" in c && !!c.unreviewed;
    const protectedUnreviewed=c.protected||!!r?.protected||contentChanged;
    const aligned =
      !unreviewed &&
      !!target &&
      ((!protectedUnreviewed && !!r && r.angle_id === target.angleId && r.input_digest === digest) ||
        !!review);
    return {
      ...c,
      protected: c.protected || !!r?.protected || unreviewed || contentChanged,
      published: c.published || !!r?.published,
      scheduled: c.scheduled || !!r?.scheduled,
      strategyId: r?.strategy_id ?? null,
      version: r?.version ?? null,
      angleId: r?.angle_id ?? null,
      inputDigest: r?.input_digest ?? "",
      contentFingerprint:fingerprint,
      aligned,
      reason: unreviewed
        ? "protected_unreviewed"
        : aligned
          ? "aligned"
          : !r
            ? "legacy_unreviewed"
            : r.angle_id !== target?.angleId
              ? "previous_angle"
              : protectedUnreviewed&&!review?"protected_unreviewed":"project_changed",
    };
  });
}
export function getStrategyState(projectId: string): StrategyState {
  const { a, set, digest } = proposalSet(projectId),
    plan = projectPlan(projectId);
  const angles = json<MarketingAngle[]>(set.angles_json, []);
  const active = activeStrategy(projectId);
  const usedAngleIds = all<{ angle_id: AngleId }>(
    "SELECT angle_id FROM marketing_strategy_used WHERE project_id=? ORDER BY first_activated_at,angle_id",
    projectId,
  ).map((r) => r.angle_id);
  const pending = one<any>(
    "SELECT payload FROM marketing_strategy_preparations WHERE project_id=? AND status IN ('prepared','failed') ORDER BY created_at DESC LIMIT 1",
    projectId,
  );
  return {
    projectId,
    scope:serviceStrategyProject(projectId)?'service_communication':'project',
    plan,
    limit: plan ? PLANS[plan].marketingAngles : 0,
    angles,
    active,
    usedAngleIds,
    missingQuestions: a.missingQuestions,
    recommendation: a.missingQuestions.length
      ? null
      : {
          angleId: "usage",
          reason:
            loadProject(projectId).settings.language === "en"
              ? "The project describes an offer and its use. Starting from that concrete moment helps explain its place without inventing performance. This recommendation is a hypothesis; the choice remains yours."
              : "Le contexte décrit une offre et son usage. Commencer par ce moment concret permet d’en expliquer la place sans inventer de performance. Cette recommandation reste une hypothèse, votre choix vous appartient.",
        },
    generalistExplanation:
      loadProject(projectId).settings.language === "en"
        ? GENERALIST_EXPLANATION_EN
        : GENERALIST_EXPLANATION,
    analysis: {
      ...json<any>(set.analysis_json, {}),
      currentInputDigest: digest,
    },
    alignment: serviceStrategyProject(projectId)?[]:inventory(projectId, active),
    pending: pending ? JSON.parse(pending.payload) : null,
  };
}
function impactOf(contents: StrategyContent[]): StrategyImpact[] {
  const modules = [...new Set(contents.map((c) => c.module))];
  return modules.map((module) => {
    const rows = contents.filter((c) => c.module === module);
    return {
      module,
      total: rows.length,
      reusable: rows.filter((c) => c.aligned).length,
      protected: rows.filter((c) => c.protected).length,
      published: rows.filter((c) => c.published).length,
      scheduled: rows.filter((c) => c.scheduled).length,
      needsReview: rows.filter((c) => !c.aligned && !c.published).length,
    };
  });
}
function readPreparation(
  projectId: string,
  preparationId: string,
): StrategyPreparation {
  schema();
  const r = one<any>(
    "SELECT payload,status FROM marketing_strategy_preparations WHERE id=? AND project_id=?",
    preparationId,
    projectId,
  );
  if (!r)
    throw new HttpError(
      404,
      "Préparation stratégique introuvable pour ce projet.",
      "strategy_preparation_missing",
    );
  return { ...JSON.parse(r.payload), status: r.status };
}
export function preparationStrategy(
  projectId: string,
  preparationId: string,
): ActiveStrategy {
  const prep = readPreparation(projectId, preparationId),
    state = getStrategyState(projectId),
    angle = state.angles.find((a) => a.id === prep.angleId)!;
  return {
    id: `draft-${prep.id}`,
    projectId,
    version:
      (one<{ v: number }>(
        "SELECT MAX(version) v FROM marketing_strategy_versions WHERE project_id=?",
        projectId,
      )?.v ?? 0) + 1,
    angleId: prep.angleId,
    angle,
    inputDigest: prep.inputDigest,
    activatedAt: 0,
  };
}
export function prepareStrategyChange(
  projectId: string,
  value: string,
): StrategyPreparation {
  const angleId = canonicalAngle(value);
  schema();
  return tx(() => {
    quota(projectId, angleId);
    const state = getStrategyState(projectId);
    if (state.missingQuestions.length)
      throw new HttpError(
        409,
        state.missingQuestions.map((q) => q.question).join(" "),
        "strategy_context_missing",
      );
    const digest = inputDigest(loadProject(projectId));
    const target: ActiveStrategy = {
      id: "pending",
      projectId,
      version: 0,
      angleId,
      angle: state.angles.find((a) => a.id === angleId)!,
      inputDigest: digest,
      activatedAt: 0,
    };
    const contents = serviceStrategyProject(projectId)?[]:inventory(projectId, target),
      inventoryDigest = hash(contents);
    const existing = all<any>(
      "SELECT payload FROM marketing_strategy_preparations WHERE project_id=? AND angle_id=? AND status='prepared'",
      projectId,
      angleId,
    )
      .map((r) => JSON.parse(r.payload) as StrategyPreparation)
      .find(
        (p) =>
          p.inputDigest === digest &&
          p.baseStrategyId === (state.active?.id ?? null) &&
          p.inventoryDigest === inventoryDigest,
      );
    if (existing) return existing;
    const p: StrategyPreparation = {
      scope:serviceStrategyProject(projectId)?"service_communication":"project",
      id: id(),
      projectId,
      angleId,
      inputDigest: digest,
      baseStrategyId: state.active?.id ?? null,
      inventoryDigest,
      status: "prepared",
      impact: impactOf(contents),
      contents,
      createdAt: now(),
      cost: {
        localPercent: 0,
        paidWork: "none_authorized",
        explanation:
          "Préparation locale sans dépense ni remplacement. Les générations manquantes nécessitent leur devis et votre consentement existants ; aucune régénération automatique.",
      },
    };
    run(
      "INSERT INTO marketing_strategy_preparations VALUES(?,?,?,?,?,?)",
      p.id,
      projectId,
      angleId,
      JSON.stringify(p),
      "prepared",
      p.createdAt,
    );
    return p;
  });
}
/** Resolve native versions by ownership, including inactive staged versions; deleted assets cannot be blessed. */
function contentExists(
  projectId: string,
  module: string,
  contentId: string,
): boolean {
  if(module === "copy")return nativeInventory(projectId).some(c=>c.module===module&&c.contentId===contentId);
  const tables: Record<string, string> = {
    theme: "theme_versions",
    asset: "assets",
    seo: "content_documents",
    video: "video_documents",
    ad: "ad_documents",
    post: "posts",
    blog: "blog_articles",
    campaign: "campaigns",
    calendar: "content_plans",
  };
  const table = tables[module];
  return table
    ? !!one(
        `SELECT id FROM ${table} WHERE project_id=? AND id=?${module === "asset" || module === "blog" ? " AND deleted_at IS NULL" : ""}`,
        projectId,
        contentId,
      )
    : !!one(
        "SELECT 1 FROM marketing_strategy_contents WHERE project_id=? AND module=? AND content_id=?",
        projectId,
        module,
        contentId,
      );
}
/** Stage complete, checked module output IDs. Retaining engine output is an explicit choice, never a claim of alignment. */
export function stageStrategyModule(
  projectId: string,
  preparationId: string,
  module: string,
  options: {
    contentIds: string[];
    retainedContentIds?: string[];
    replacements?: { oldId: string; newId: string }[];
  },
) {
  if(serviceStrategyProject(projectId))throw new HttpError(409,'Les contenus de services conservent leur angle propre ; aucun remplacement global du site ou des campagnes.','strategy_service_no_global_revision');
  schema();
  const prep = readPreparation(projectId, preparationId);
  if (prep.status !== "prepared")
    throw new HttpError(
      409,
      "Cette préparation n’est plus ouverte.",
      "strategy_preparation_closed",
    );
  const target = preparationStrategy(projectId, preparationId);
  if (options.contentIds.some((cid) => !contentExists(projectId, module, cid)))
    throw new HttpError(
      404,
      "Une version préparée n’appartient pas à ce projet ou module.",
      "strategy_content_missing",
    );
  for(const cid of options.contentIds){const before=prep.contents.find(c=>c.module===module&&c.contentId===cid);if(before?.contentFingerprint&&before.contentFingerprint!==contentFingerprint(projectId,module,cid))throw new HttpError(409,'Le contenu a changé depuis l’inventaire. Relisez sa nouvelle version avant de confirmer sa compatibilité.','strategy_content_changed');}
  const retained = options.retainedContentIds ?? [];
  if (
    retained.some(
      (cid) =>
        !prep.contents.some((c) => c.module === module && c.contentId === cid),
    )
  )
    throw new HttpError(
      400,
      "Conservation hors de l’inventaire confirmé.",
      "strategy_retention_invalid",
    );
  const replacements = options.replacements ?? [];
  if (
    replacements.some(
      (r) =>
        !prep.contents.some(
          (c) => c.module === module && c.contentId === r.oldId,
        ) || !options.contentIds.includes(r.newId),
    )
  )
    throw new HttpError(
      400,
      "Chaque remplacement doit relier une ancienne version inventoriée à une nouvelle version vérifiée.",
      "strategy_replacement_invalid",
    );
  const previous = one<any>(
    "SELECT * FROM marketing_strategy_staging WHERE preparation_id=? AND module=?",
    preparationId,
    module,
  );
  const priorIds = json<string[]>(previous?.content_ids, []),
    priorRetained = json<string[]>(previous?.retained_ids, []),
    priorReplacements = json<{ oldId: string; newId: string }[]>(
      previous?.replacements_json,
      [],
    );
  run(
    "INSERT OR REPLACE INTO marketing_strategy_staging VALUES(?,?,?,?,?)",
    preparationId,
    module,
    JSON.stringify([
      ...new Set([
        ...priorIds.filter((cid) => !retained.includes(cid)),
        ...options.contentIds,
      ]),
    ]),
    JSON.stringify([
      ...new Set([
        ...priorRetained.filter((cid) => !options.contentIds.includes(cid)),
        ...retained,
      ]),
    ]),
    JSON.stringify([
      ...priorReplacements.filter(
        (r) => !replacements.some((n) => n.oldId === r.oldId),
      ),
      ...replacements,
    ]),
  );
  return {
    ...target,
    module,
    contentIds: options.contentIds,
    retainedContentIds: retained,
  };
}
export function failStrategyPreparation(
  projectId: string,
  preparationId: string,
  reason: string,
) {
  const prep = readPreparation(projectId, preparationId);
  if (prep.status === "activated")
    throw new HttpError(
      409,
      "La stratégie est déjà activée.",
      "strategy_preparation_closed",
    );
  run(
    "UPDATE marketing_strategy_preparations SET status=?,payload=? WHERE id=? AND project_id=?",
    "failed",
    JSON.stringify({ ...prep, status: "failed", failure: reason }),
    preparationId,
    projectId,
  );
}
export function activateStrategy(
  projectId: string,
  options: {
    angleId: string;
    preparationId: string;
    idempotencyKey: string;
    confirmed: true;
    retainUnaligned?: boolean;
    commitPrepared?: (strategy: ActiveStrategy) => void;
  },
): ActiveStrategy {
  schema();
  if (options.confirmed !== true || !options.idempotencyKey?.trim())
    throw new HttpError(
      400,
      "Votre confirmation explicite et une clé de reprise sont nécessaires.",
      "strategy_confirmation_required",
    );
  const angleId = canonicalAngle(options.angleId);
  return tx(() => {
    const prior = one<any>(
      "SELECT * FROM marketing_strategy_requests WHERE project_id=? AND idempotency_key=?",
      projectId,
      options.idempotencyKey,
    );
    if (prior) {
      if (prior.angle_id !== angleId)
        throw new HttpError(
          409,
          "Cette clé de reprise correspond à un autre angle.",
          "strategy_idempotency_conflict",
        );
      return version(
        one(
          "SELECT * FROM marketing_strategy_versions WHERE id=?",
          prior.strategy_id,
        ),
      )!;
    }
    quota(projectId, angleId);
    if (
      !serviceStrategyProject(projectId) && one(
        "SELECT id FROM posts WHERE project_id=? AND status='publishing' LIMIT 1",
        projectId,
      )
    )
      throw new HttpError(
        409,
        "Une publication est en cours d’envoi. Attendez son résultat avant de changer de stratégie.",
        "strategy_publication_in_flight",
      );
    const prep = readPreparation(projectId, options.preparationId);
    if (prep.angleId !== angleId)
      throw new HttpError(
        409,
        "La préparation correspond à un autre angle.",
        "strategy_preparation_conflict",
      );
    if (prep.status === "activated") {
      const saved = activeStrategy(projectId);
      if (
        saved?.angleId === angleId &&
        saved.inputDigest === prep.inputDigest
      ) {
        run(
          "INSERT INTO marketing_strategy_requests VALUES(?,?,?,?)",
          projectId,
          options.idempotencyKey,
          angleId,
          saved.id,
        );
        return saved;
      }
    }
    if (prep.status !== "prepared")
      throw new HttpError(
        409,
        "La préparation a échoué ou est déjà clôturée ; reprenez sa vérification.",
        "strategy_preparation_closed",
      );
    const current = activeStrategy(projectId);
    if((prep.scope??'project')!==(serviceStrategyProject(projectId)?'service_communication':'project'))throw new HttpError(409,'La portée de préparation a changé. Préparez un nouveau choix sans remplacer les contenus existants.','strategy_preparation_stale');
    if (
      prep.inputDigest !== inputDigest(loadProject(projectId)) ||
      prep.baseStrategyId !== (current?.id ?? null)
    )
      throw new HttpError(
        409,
        "Le projet ou l’angle actif a changé depuis la préparation. Actualisez l’impact avant confirmation.",
        "strategy_preparation_stale",
      );
    if(one("SELECT 1 FROM sqlite_master WHERE name='marketing_strategy_bundles'")&&one("SELECT 1 FROM marketing_strategy_bundles b JOIN jobs j ON j.id=b.job_id WHERE b.project_id=? AND b.preparation_id=? AND j.status IN ('queued','running','paused','blocked')",projectId,options.preparationId))throw new HttpError(409,'La préparation des révisions est encore en cours. Les versions précédentes restent actives.','strategy_revision_in_flight');
    const stages = all<any>(
      "SELECT * FROM marketing_strategy_staging WHERE preparation_id=?",
      prep.id,
    ).map((r) => ({
      module: r.module,
      contentIds: json<string[]>(r.content_ids, []),
      retainedIds: json<string[]>(r.retained_ids, []),
      replacements: json<{ oldId: string; newId: string }[]>(
        r.replacements_json,
        [],
      ),
    }));
    if (
      stages.some((stage) =>
        stage.contentIds.some(
          (cid) => !contentExists(projectId, stage.module, cid),
        ),
      )
    )
      throw new HttpError(
        409,
        "Une version préparée manque ou a été supprimée ; la stratégie précédente est conservée.",
        "strategy_staged_content_missing",
      );
    const target = preparationStrategy(projectId, prep.id);
    const freshInventory = serviceStrategyProject(projectId)?[]:inventory(projectId, target);
    if(freshInventory.some(c=>{const before=prep.contents.find(old=>old.module===c.module&&old.contentId===c.contentId);return before&&before.contentFingerprint!==c.contentFingerprint;}))throw new HttpError(409,'Un contenu a été retouché pendant la préparation. Les versions sont conservées ; actualisez puis vérifiez la nouvelle version avant activation.','strategy_content_changed');
    const concurrent = freshInventory.filter(
      (c) =>
        !prep.contents.some(
          (old) => old.module === c.module && old.contentId === c.contentId,
        ) &&
        !stages.some(
          (s) => s.module === c.module && s.contentIds.includes(c.contentId),
        ),
    );
    if (concurrent.length)
      throw new HttpError(
        409,
        "De nouveaux contenus sont apparus pendant la préparation ; actualisez l’inventaire avant activation.",
        "strategy_inventory_stale",
      );
    const uncovered = prep.contents.filter(
      (c) =>
        !c.aligned &&
        !c.published &&
        !(
          (c.protected && options.retainUnaligned) ||
          stages.some(
            (s) =>
              s.module === c.module &&
              (s.contentIds.includes(c.contentId) ||
                s.retainedIds.includes(c.contentId) ||
                s.replacements.some(
                  (r) =>
                    r.oldId === c.contentId && s.contentIds.includes(r.newId),
                )),
          )
        ),
    );
    if (uncovered.length)
      throw new HttpError(
        409,
        `Préparez ou conservez explicitement les contenus dépendants avant l’activation : ${[...new Set(uncovered.map((c) => c.module))].join(", ")}. La version précédente reste active.`,
        "strategy_modules_unprepared",
      );
    const candidate = preparationStrategy(projectId, prep.id);
    const active: ActiveStrategy =
      current?.angleId === angleId &&
      current.inputDigest === candidate.inputDigest
        ? current
        : { ...candidate, id: `strategy-${id()}`, activatedAt: now() };
    // The synchronous commit only moves pointers to already saved/acquired module versions. A thrown error rolls everything back.
    options.commitPrepared?.(active);
    if (active !== current)
      run(
        "INSERT INTO marketing_strategy_versions VALUES(?,?,?,?,?,?,?)",
        active.id,
        projectId,
        active.version,
        angleId,
        JSON.stringify(active.angle),
        active.inputDigest,
        active.activatedAt,
      );
    run(
      "INSERT OR IGNORE INTO marketing_strategy_used VALUES(?,?,?)",
      projectId,
      angleId,
      now(),
    );
    run(
      "INSERT OR REPLACE INTO marketing_strategy_active VALUES(?,?)",
      projectId,
      active.id,
    );
    run(
      "UPDATE marketing_strategy_contents SET strategy_id=?,version=? WHERE project_id=? AND strategy_id=? AND EXISTS (SELECT 1 FROM marketing_strategy_staging staged, json_each(staged.content_ids) ids WHERE staged.preparation_id=? AND staged.module=marketing_strategy_contents.module AND ids.value=marketing_strategy_contents.content_id)",
      active.id,
      active.version,
      projectId,
      `draft-${prep.id}`,
      prep.id,
    );
    // Replacement archives are preserved and explicitly readable, but no longer offered as current output.
    for(const stage of stages){
      for(const replacement of stage.replacements)if(replacement.oldId!==replacement.newId)run('INSERT OR REPLACE INTO marketing_strategy_archives VALUES(?,?,?,?)',projectId,stage.module,replacement.oldId,replacement.newId);
      for(const cid of stage.contentIds)run('DELETE FROM marketing_strategy_archives WHERE project_id=? AND module=? AND content_id=?',projectId,stage.module,cid);
    }
    // A→B→A makes previously acquired, semantically compatible A versions available again, without relabelling them.
    run('DELETE FROM marketing_strategy_archives WHERE project_id=? AND EXISTS (SELECT 1 FROM marketing_strategy_contents c WHERE c.project_id=marketing_strategy_archives.project_id AND c.module=marketing_strategy_archives.module AND c.content_id=marketing_strategy_archives.content_id AND c.angle_id=? AND c.input_digest=?)',projectId,active.angleId,active.inputDigest);
    for (const scheduled of prep.contents.filter(
      (c) => c.module === "post" && c.scheduled && !c.aligned,
    )) {
      const checked = stages.some(
        (s) =>
          s.module === "post" && s.contentIds.includes(scheduled.contentId),
      );
      if (!checked)
        run(
          "UPDATE posts SET status='review',error=?,updated_at=? WHERE id=? AND project_id=? AND status='scheduled'",
          "Stratégie modifiée : adaptez cette publication ou confirmez sa compatibilité avant de reprogrammer.",
          now(),
          scheduled.contentId,
          projectId,
        );
    }
    for (const stage of stages)
      for (const cid of stage.contentIds) {
        run(
          "INSERT OR REPLACE INTO marketing_strategy_reviews (project_id,module,content_id,strategy_id,input_digest,content_fingerprint) VALUES(?,?,?,?,?,?)",
          projectId,
          stage.module,
          cid,
          active.id,
          active.inputDigest,
          contentFingerprint(projectId,stage.module,cid),
        );
      }
    run(
      "INSERT INTO marketing_strategy_requests VALUES(?,?,?,?)",
      projectId,
      options.idempotencyKey,
      angleId,
      active.id,
    );
    run(
      "UPDATE marketing_strategy_preparations SET status=? WHERE id=?",
      "activated",
      prep.id,
    );
    return active;
  });
}
export function recordStrategyContent(
  projectId: string,
  module: string,
  contentId: string,
  options: {
    strategy?: Pick<
      ActiveStrategy,
      "id" | "version" | "angleId" | "inputDigest"
    > | null;
    protected?: boolean;
    published?: boolean;
    scheduled?: boolean;
  } = {},
) {
  schema();
  const s = Object.hasOwn(options, "strategy")
    ? options.strategy
    : defaultStrategy(projectId);
  run(
    "INSERT OR REPLACE INTO marketing_strategy_contents (project_id,module,content_id,strategy_id,version,angle_id,input_digest,protected,published,scheduled,content_fingerprint) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    projectId,
    module,
    contentId,
    s?.id ?? null,
    s?.version ?? null,
    s?.angleId ?? null,
    s?.inputDigest ?? "",
    options.protected ? 1 : 0,
    options.published ? 1 : 0,
    options.scheduled ? 1 : 0,
    contentFingerprint(projectId,module,contentId),
  );
  return s ?? null;
}
export function assertContentAlignment(
  projectId: string,
  module: string,
  contentId: string,
  options:{operation?:"generation"|"publish"}={},
) {
  schema();
  let active = activeStrategy(projectId);
  if(serviceStrategyProject(projectId)){
   const row=one<{strategy_id:string|null}>('SELECT strategy_id FROM marketing_strategy_contents WHERE project_id=? AND module=? AND content_id=?',projectId,module,contentId);
   if(!row?.strategy_id&&module==='post'&&options.operation==='publish'){
    const legacy=one<{created_at:number;engine:string;approved_at:number|null;approved_hash:string|null;content_hash:string|null}>('SELECT created_at,engine,approved_at,approved_hash,content_hash FROM posts WHERE project_id=? AND id=?',projectId,contentId);
    const first=one<{at:number|null}>('SELECT MIN(first_activated_at) at FROM marketing_strategy_used WHERE project_id=?',projectId)?.at;
    // Existing approvals are not retroactively invalidated by introducing campaign angles.
    // The native scheduler still verifies the real content hash, rights, claims and media before sending.
    if(legacy?.approved_at&&(legacy.engine!=='v2'||legacy.approved_hash&&legacy.approved_hash===legacy.content_hash)&&(!first||legacy.created_at<first))return;
   }
   if(!row?.strategy_id)throw new HttpError(409,'Cette communication doit être relue et rattachée explicitement à un angle autorisé avant production ou envoi.','strategy_content_unaligned');
   active=communicationStrategy(projectId,{strategyId:row.strategy_id});
  }
  if (!active) return;
  const content = inventory(projectId, active).find(
    (c) => c.module === module && c.contentId === contentId,
  );
  if (!content?.aligned)
    throw new HttpError(
      409,
      "Ce contenu relève d’un ancien angle ou n’a pas été vérifié. Adaptez-le ou confirmez sa compatibilité avec la stratégie active avant l’envoi.",
      "strategy_content_unaligned",
    );
}

/** Recheck angle rights and facts before a preparation can spend or acquire more work. */
export function assertStrategyPreparationCurrent(projectId:string,preparationId:string){
 schema();const prep=readPreparation(projectId,preparationId);quota(projectId,prep.angleId);
 if((prep.scope??'project')!==(serviceStrategyProject(projectId)?'service_communication':'project'))throw new HttpError(409,'La portée de préparation a changé. Préparez un nouveau choix.','strategy_preparation_stale');
 if(prep.status!=='prepared')throw new HttpError(409,'Cette préparation est clôturée.','strategy_preparation_closed');
 if(prep.inputDigest!==currentStrategyInputDigest(projectId)||prep.baseStrategyId!==(activeStrategy(projectId)?.id??null))throw new HttpError(409,'Le projet ou son angle actif a changé ; actualisez la préparation. Aucun nouvel appel n’a été lancé.','strategy_preparation_stale');
 return prep;
}

export function reviewServiceCommunication(projectId:string,module:string,contentId:string,angleId?:string){
 if(!serviceStrategyProject(projectId))return;
 schema();const row=one<{strategy_id:string|null}>('SELECT strategy_id FROM marketing_strategy_contents WHERE project_id=? AND module=? AND content_id=?',projectId,module,contentId);
 const s=communicationStrategy(projectId,row?.strategy_id?{strategyId:row.strategy_id}:{angleId});
 if(module==='post'){
  const media=one<{media:string}>('SELECT media FROM posts WHERE project_id=? AND id=?',projectId,contentId);
  for(const aid of json<string[]>(media?.media??'[]',[])){const asset=one<{angle_id:string|null;input_digest:string}>("SELECT angle_id,input_digest FROM marketing_strategy_contents WHERE project_id=? AND module='asset' AND content_id=?",projectId,aid);if(asset?.angle_id&&(asset.angle_id!==s.angleId||asset.input_digest!==s.inputDigest))throw new HttpError(409,'Un média dépend d’un autre angle ou d’anciennes informations. Reprenez le média de cet angle avant d’approuver.','strategy_media_unaligned');}
 }

 if(!contentExists(projectId,module,contentId))throw new HttpError(404,'Contenu introuvable.');
 if(!row?.strategy_id)recordStrategyContent(projectId,module,contentId,{strategy:s,protected:true});
 run('INSERT OR REPLACE INTO marketing_strategy_reviews VALUES(?,?,?,?,?,?)',projectId,module,contentId,s.id,s.inputDigest,contentFingerprint(projectId,module,contentId));
}

/** Compatibility of the actual source delivered into a prepared theme, including explicit draft review. */
export function strategySourceCompatible(projectId:string,module:string,contentId:string,target:ActiveStrategy):boolean {
 schema();const c=one<any>('SELECT * FROM marketing_strategy_contents WHERE project_id=? AND module=? AND content_id=?',projectId,module,contentId);
 const fingerprint=contentFingerprint(projectId,module,contentId);
 if(c&&!c.protected&&c.content_fingerprint===fingerprint&&c.angle_id===target.angleId&&c.input_digest===target.inputDigest)return true;
 if(one('SELECT 1 FROM marketing_strategy_reviews r LEFT JOIN marketing_strategy_versions v ON v.id=r.strategy_id WHERE r.project_id=? AND r.module=? AND r.content_id=? AND r.input_digest=? AND r.content_fingerprint=? AND (r.strategy_id=? OR (v.angle_id=? AND v.input_digest=?))',projectId,module,contentId,target.inputDigest,fingerprint,target.id,target.angleId,target.inputDigest))return true;
 if(target.id.startsWith('draft-')){
  const prep=assertStrategyPreparationCurrent(projectId,target.id.slice(6));
  const before=prep.contents.find(c=>c.module===module&&c.contentId===contentId);
  if(before?.contentFingerprint===fingerprint&&one('SELECT 1 FROM marketing_strategy_staging s,json_each(s.content_ids) ids WHERE s.preparation_id=? AND s.module=? AND ids.value=?',prep.id,module,contentId))return true;
 }
 return false;
}
