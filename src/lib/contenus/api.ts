/**
 * API native des contenus métier (#239, phase 4) : une seule forme pour les biens, la carte, les réalisations et les
 * prestations, réutilisable plus tard par l'assistant SYNA (aucun assistant n'est branché ici).
 *
 * - Opérations : `list`, `get`, `create`, `update`, `publish`, `withdraw`, `archive`, `status` (vendu, loué…), `reorder`.
 *   Toujours dans UN projet du compte connecté ; aucune suppression (archiver garde la donnée).
 * - Versions : chaque élément porte `version` (date de dernière modification ; pour les prestations, la version du site
 *   qui les contient). Une modification peut exiger `ifVersion` : si l'élément a changé entre-temps, rien n'est écrit (409).
 * - Consentement : tout changement de visibilité (publier, retirer, archiver, changer d'état) exige `confirm: true`,
 *   que l'interface ou l'assistant n'envoie qu'après l'accord explicite du professionnel (sinon 428, rien n'est fait).
 * - Le site hébergé n'est jamais publié par cette API : les changements vont dans l'aperçu, et c'est le professionnel
 *   qui publie une nouvelle version du site (onglet Site) ; chaque réponse dit si le site en ligne est à jour.
 */
import { HttpError } from "../auth";
import { L } from "../i18n-server";
import { currentTheme } from "../projects";
import { BIEN_STATUSES, createBien, getBien, listBiens, missingForPublication as bienMissing, reorderBiens, setBienStatus, updateBien, type Bien } from "../biens";
import { createItem, getItem, ITEM_STATUSES, listCarte, reorderItems, setItemStatus, updateItem, type CarteItem } from "./carte";
import { readPrestations, savePrestations } from "./prestations";
import { createRealisation, getRealisation, listRealisations, missingForPublication as realMissing, REALISATION_STATUSES, reorderRealisations, setRealisationStatus, updateRealisation, type Realisation } from "./realisations";
import { siteFreshness } from "../sites/publish";

export const CONTENT_TYPES = ["biens", "plats", "realisations", "prestations"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export type ContentItem = { id: string; type: ContentType; title: string; status: string | null; version: string; missing: string[]; data: unknown };

type Adapter = {
  label: [string, string];
  /** Métier pour lequel le thème du site affiche ce contenu. */
  shown: (direction: string | null) => boolean;
  statuses: readonly string[];
  list: (pid: string, archived: boolean) => ContentItem[];
  get: (pid: string, id: string) => ContentItem;
  create?: (pid: string, userId: string, data: Record<string, unknown>) => ContentItem;
  update: (pid: string, id: string, data: Record<string, unknown>) => ContentItem;
  status?: (pid: string, id: string, status: string) => ContentItem;
  reorder?: (pid: string, ids: string[]) => void;
};

const bien = (b: Bien): ContentItem => ({ id: b.id, type: "biens", title: b.data.title || b.ref, status: b.status, version: String(b.updatedAt), missing: bienMissing(b.transaction, b.data), data: b });
const plat = (i: CarteItem): ContentItem => ({ id: i.id, type: "plats", title: i.name, status: i.status, version: String(i.updatedAt), missing: i.price == null && !i.priceText.trim() ? [L("un prix ou une mention de prix", "a price or a price note")] : [], data: i });
const real = (r: Realisation): ContentItem => ({ id: r.id, type: "realisations", title: r.title, status: r.status, version: String(r.updatedAt), missing: realMissing(r), data: r });
const prestations = (pid: string): ContentItem => {
  const p = readPrestations(pid);
  if (!p) throw new HttpError(404, L("Ce site n'a pas de réservation intégrée (salon, cabinet ou restaurant).", "This site has no built-in booking (salon, practice or restaurant)."));
  return { id: "prestations", type: "prestations", title: L("Prestations, horaires et intervenants", "Services, hours and staff"), status: null, version: p.versionId, missing: [], data: p };
};

const ADAPTERS: Record<ContentType, Adapter> = {
  biens: {
    label: ["Biens", "Properties"], shown: (d) => d === "maison-horizon", statuses: BIEN_STATUSES,
    list: (pid, archived) => listBiens(pid, { archived }).map(bien),
    get: (pid, id) => bien(getBien(pid, id)),
    create: (pid, uid, data) => bien(createBien(uid, pid, { transaction: data.transaction === "location" ? "location" : "vente", ref: typeof data.ref === "string" ? data.ref : undefined, data: (data.data ?? data) as Record<string, unknown> })),
    update: (pid, id, data) => bien(updateBien(pid, id, { transaction: data.transaction === "location" || data.transaction === "vente" ? data.transaction : undefined, data: (data.data ?? data) as Record<string, unknown> })),
    status: (pid, id, s) => bien(setBienStatus(pid, id, s as Bien["status"])),
    reorder: reorderBiens,
  },
  plats: {
    label: ["Carte", "Menu"], shown: (d) => d === "table-saison", statuses: ITEM_STATUSES,
    list: (pid, archived) => listCarte(pid, { archived }).items.map(plat),
    get: (pid, id) => plat(getItem(pid, id)),
    create: (pid, _uid, data) => plat(createItem(pid, data)),
    update: (pid, id, data) => plat(updateItem(pid, id, data)),
    status: (pid, id, s) => plat(setItemStatus(pid, id, s as CarteItem["status"])),
    reorder: reorderItems,
  },
  realisations: {
    label: ["Réalisations", "Projects"], shown: (d) => d === "rive" || d === "aplat" || d === "phase", statuses: REALISATION_STATUSES,
    list: (pid, archived) => listRealisations(pid, { archived }).map(real),
    get: (pid, id) => real(getRealisation(pid, id)),
    create: (pid, _uid, data) => real(createRealisation(pid, data)),
    update: (pid, id, data) => real(updateRealisation(pid, id, data)),
    status: (pid, id, s) => real(setRealisationStatus(pid, id, s as Realisation["status"])),
    reorder: reorderRealisations,
  },
  prestations: {
    label: ["Prestations et horaires", "Services and hours"], shown: () => false, statuses: [],
    list: (pid) => { try { return [prestations(pid)]; } catch { return []; } },
    get: (pid, id) => { if (id !== "prestations") throw new HttpError(404, L("Élément introuvable.", "Item not found.")); return prestations(pid); },
    update: (pid, _id, data) => { savePrestations(pid, data); return prestations(pid); },
  },
};

export function adapter(type: string): Adapter {
  if (!(CONTENT_TYPES as readonly string[]).includes(type)) throw new HttpError(404, L("Type de contenu inconnu.", "Unknown content type."));
  return ADAPTERS[type as ContentType];
}

/** État du site hébergé : les contenus modifiés ne sont en ligne qu'après une publication choisie par le professionnel. */
export function siteState(pid: string) {
  const f = siteFreshness(pid);
  return { live: f.live, upToDate: f.upToDate, note: f.live && !f.upToDate ? L("Le site en ligne n'affiche pas encore ces changements : publiez une nouvelle version depuis l'onglet Site.", "The live site doesn't show these changes yet: publish a new version from the Website tab.") : null };
}

/** Types de contenus de ce projet : ceux que son thème affiche, et ceux qui ont déjà des données. */
export function contentManifest(pid: string) {
  const direction = currentTheme(pid)?.spec.direction ?? null;
  const types = CONTENT_TYPES.map((type) => {
    const a = ADAPTERS[type];
    const count = a.list(pid, false).length;
    const shown = type === "prestations" ? count > 0 : a.shown(direction);
    return { type, label: L(...a.label), shownBySite: shown, count, statuses: a.statuses, actions: ["list", "get", ...(a.create ? ["create"] : []), "update", ...(a.status ? ["publish", "withdraw", "archive", "status"] : []), ...(a.reorder ? ["reorder"] : [])] };
  }).filter((x) => x.shownBySite || x.count > 0);
  return { projectId: pid, types, site: siteState(pid) };
}

const confirmed = (confirm: unknown) => {
  if (confirm !== true) throw new HttpError(428, L("Confirmation requise : ce changement modifie ce que verront les visiteurs (après publication du site). Renvoyez la demande avec confirm: true une fois l'accord du professionnel obtenu.", "Confirmation required: this change alters what visitors will see (once the site is published). Resend with confirm: true once the professional has agreed."), "confirmation_required");
};
const fresh = (cur: ContentItem, ifVersion: unknown) => {
  if (ifVersion != null && String(ifVersion) !== cur.version) throw new HttpError(409, L("Cet élément a été modifié entre-temps : relisez-le avant de le modifier.", "This item changed in the meantime: read it again before editing."), "version_conflict");
};

/** Modification (avec contrôle de version facultatif). */
export function updateContent(pid: string, type: string, id: string, data: Record<string, unknown>, ifVersion?: unknown) {
  const a = adapter(type);
  fresh(a.get(pid, id), ifVersion);
  return a.update(pid, id, data);
}

/** Publier, retirer, archiver ou changer d'état : toujours avec l'accord explicite du professionnel. */
export function setContentStatus(pid: string, type: string, id: string, action: "publish" | "withdraw" | "archive" | "status", opts: { status?: string; confirm?: unknown; ifVersion?: unknown }) {
  const a = adapter(type);
  if (!a.status) throw new HttpError(405, L("Ce contenu n'a pas d'état de publication : il suit le site.", "This content has no publication state: it follows the site."));
  confirmed(opts.confirm);
  const cur = a.get(pid, id);
  fresh(cur, opts.ifVersion);
  const status = action === "publish" ? "published" : action === "withdraw" ? "withdrawn" : action === "archive" ? "archived" : opts.status ?? "";
  if (!a.statuses.includes(status)) throw new HttpError(400, L("État inconnu pour ce contenu.", "Unknown state for this content."));
  return a.status(pid, id, status);
}
