/**
 * SINA PREND LES DEVANTS (23 novembre 2026, demande du propriétaire : « qu'elle prenne les devants ») : quand des planches
 * sont incomplètes (un logo, une grande scène ou un haut du site y manque, lu sur leur contenu par `planchesIncompletes`),
 * le Studio pose lui-même dans le fil, à l'ouverture du projet et SANS AUCUN APPEL À L'IA, un message de SINA qui dit ce
 * qui manque et propose de le finir à sa charge, avec « Oui, finis-les » et « Plus tard ». Le message n'est posé qu'une
 * fois pour un même état des planches (empreinte de ce qui manque), jamais pendant une reprise.
 *
 * Au message suivant du client, le contexte de SINA porte en tête une ligne prioritaire : ce qui manque, à dire et à
 * proposer avant tout le reste. Elle disparaît quand il a dit oui (reprise en cours, ou carte d'accord ouverte) ou non.
 * Le « non » se repère sans rien deviner : un clic sur « Plus tard », ou un refus de la carte d'accord de cette reprise
 * (un bouton est sans ambiguïté et ne coûte aucune lecture par l'IA ; une phrase du client se lirait mal sans elle).
 */
import { json, one, run } from "../db";
import { pendingJob } from "../jobs";
import { L } from "../i18n-server";
import { addMessage, type SynaMessage } from "./store";
import { journeyOf, planchesIncompletes, type Journey } from "./journey";
import { SINA_BRAND_JOB } from "./brand-chain";

type Image = "logo" | "hero" | "site";
const ORDRE: Image[] = ["logo", "hero", "site"];
const NOM_FR: Record<Image, string> = { logo: "le logo", hero: "la grande scène", site: "le haut du site" };
const NOM_EN: Record<Image, string> = { logo: "the logo", hero: "the main scene", site: "the top of the site" };

export type PlancheAFinir = { key: string; name: string; manque: string[] };
type Etat = { posee?: string; refus?: string };

/** Les planches à finir, avec leur nom : seulement avant le choix de l'identité, et dans le parcours de création. */
export function planchesAFinir(j: Journey): PlancheAFinir[] {
  if (j.outside || j.identityChoice) return [];
  return planchesIncompletes(j).map((h) => ({ ...h, name: j.identities?.list.find((x) => x.key === h.key)?.name ?? h.key }));
}

/** L'empreinte de ce qui manque : la même tant que rien ne change. */
export const empreinteDuManque = (list: readonly { key: string; manque: readonly string[] }[]): string =>
  list.map((x) => `${x.key}:${[...x.manque].sort().join("+")}`).sort().join("|");

/** « de Sillage », « d'Aurore » (jamais devant un h). */
const de = (nom: string) => (/^[aeiouyàâäéèêëîïôöùûüœæ]/i.test(nom) ? `d'${nom}` : `de ${nom}`);
const liste = (xs: string[], et: string) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${et} ${xs[xs.length - 1]}`);

/** Le pronom de ce qui manque : « les » (plusieurs images), sinon « le » ou « la » selon l'image. */
export function pronomDuManque(list: readonly { manque: readonly string[] }[]): "les" | "le" | "la" {
  const toutes = list.flatMap((x) => x.manque);
  return toutes.length > 1 ? "les" : toutes[0] === "hero" ? "la" : "le";
}

/**
 * La phrase de SINA, construite par le code à partir de ce qui manque vraiment, avec les vrais noms (français et anglais).
 * « Il manque le logo de Sillage, de Halo et de Pénombre. Je les finis à ma charge, ça ne te coûte rien. On y va ? »
 */
export function phraseDuManque(list: readonly PlancheAFinir[]): { fr: string; en: string } {
  const pr = pronomDuManque(list), quoi = manqueEnMots(list);
  return {
    fr: `Il manque ${quoi.fr}. Je ${pr} finis à ma charge, ça ne te coûte rien. On y va ?`,
    en: `Still missing: ${quoi.en}. I'll finish ${pr === "les" ? "them" : "it"} at my expense, it costs you nothing. Shall we go ahead?`,
  };
}

/** « le logo de Sillage, de Halo et de Pénombre » / « the logo for Sillage, Halo and Pénombre ». */
export function manqueEnMots(list: readonly PlancheAFinir[]): { fr: string; en: string } {
  const parts = ORDRE.map((s) => ({ s, noms: list.filter((x) => x.manque.includes(s)).map((x) => x.name) })).filter((p) => p.noms.length);
  // Plusieurs parties dont l'une a déjà un « et » : « …, et la grande scène de Pénombre » (jamais de phrase à double sens).
  const joindre = (xs: string[], et: string) => (xs.length > 1 && xs.some((x) => x.includes(` ${et} `)) ? `${xs.slice(0, -1).join(", ")}, ${et} ${xs[xs.length - 1]}` : liste(xs, et));
  return {
    fr: joindre(parts.map((p) => `${NOM_FR[p.s]} ${liste(p.noms.map(de), "et")}`), "et"),
    en: joindre(parts.map((p) => `${NOM_EN[p.s]} for ${liste(p.noms, "and")}`), "and"),
  };
}

/** Les mots des deux boutons du message (l'écran les lit dans la langue du client). */
export const boutonsDuMessage = (pronom: "les" | "le" | "la") => ({
  oui: { fr: `Oui, finis-${pronom}`, en: pronom === "les" ? "Yes, finish them" : "Yes, finish it" },
  plusTard: { fr: "Plus tard", en: "Later" },
});

const etatDe = (cid: string): Etat => json<any>(one<{ state_json: string | null }>("SELECT state_json FROM agent_conversations WHERE id=?", cid)?.state_json ?? "{}", {}).devantsPlanches ?? {};
function noterEtat(cid: string, change: Partial<Etat>) {
  const st = json<any>(one<{ state_json: string | null }>("SELECT state_json FROM agent_conversations WHERE id=?", cid)?.state_json ?? "{}", {});
  run("UPDATE agent_conversations SET state_json=? WHERE id=?", JSON.stringify({ ...st, devantsPlanches: { ...(st.devantsPlanches ?? {}), ...change } }), cid);
}

/**
 * Le client a déjà dit oui : une création de la marque tourne (reprise des images ou proposition en cours), ou la carte
 * d'accord d'une reprise des images attend sa réponse.
 */
export function repriseEnCours(cid: string, projectId: string | null): boolean {
  if (projectId && pendingJob(projectId, SINA_BRAND_JOB)) return true;
  const r = one<{ pending_json: string | null }>("SELECT pending_json FROM syna_runs WHERE conversation_id=? AND status='waiting_confirmation' ORDER BY created_at DESC LIMIT 1", cid);
  return json<{ tool?: string } | null>(r?.pending_json ?? "null", null)?.tool === "identity.images";
}

/** Le client a dit non à cet état des planches (« Plus tard », ou la carte de cette reprise refusée). */
export function noterRefus(cid: string) {
  const list = planchesAFinir(journeyOf(cid));
  if (list.length) noterEtat(cid, { refus: empreinteDuManque(list) });
}

/** L'état de la proposition, pour l'écran : ses boutons ne se montrent que tant qu'elle tient. */
export function propositionOuverte(cid: string, projectId: string | null): { empreinte: string; ouverte: boolean } | null {
  const list = planchesAFinir(journeyOf(cid));
  if (!list.length) return null;
  const empreinte = empreinteDuManque(list), e = etatDe(cid);
  return { empreinte, ouverte: e.refus !== empreinte && !repriseEnCours(cid, projectId) };
}

/**
 * À l'ouverture du projet : pose le message de SINA s'il y a des planches à finir et que ce qui manque a changé depuis le
 * dernier message posé. Jamais pendant une reprise, ni pendant que SINA répond ou qu'une carte d'accord attend. Aucun
 * appel à l'IA : la phrase est écrite par le code.
 */
export function poserLaProposition(cid: string, projectId: string | null): SynaMessage | null {
  if (!projectId) return null;
  const list = planchesAFinir(journeyOf(cid));
  if (!list.length) return null;
  const empreinte = empreinteDuManque(list);
  if (etatDe(cid).posee === empreinte) return null;
  if (repriseEnCours(cid, projectId)) return null;
  if (one("SELECT 1 FROM syna_runs WHERE conversation_id=? AND status IN ('queued','running','waiting_confirmation')", cid)) return null;
  const phrase = phraseDuManque(list);
  noterEtat(cid, { posee: empreinte });
  return addMessage(cid, "assistant", { message: L(phrase.fr, phrase.en), actions: [], question: null, done: true, devants: { kind: "planches", empreinte, pronom: pronomDuManque(list) } }, null);
}

/**
 * La ligne prioritaire du contexte de SINA (en tête, avant tout le reste) : ce qui manque, à dire et à proposer de finir à
 * sa charge. Vide quand rien ne manque, pendant une reprise (il a dit oui) ou après son refus.
 */
export function ligneDesPlanchesAFinir(cid: string, projectId: string | null): string {
  const list = planchesAFinir(journeyOf(cid));
  if (!list.length || repriseEnCours(cid, projectId) || etatDe(cid).refus === empreinteDuManque(list)) return "";
  const groupes = groupesAFinir(list);
  return `# À DIRE EN PREMIER, avant tout le reste\nIl manque ${manqueEnMots(list).fr} (planches ${list.map((x) => `${x.key} « ${x.name} »`).join(", ")}). Ces planches ne sont pas montrées au client tant qu'elles sont incomplètes. Dis-le-lui d'abord, en mots simples, et propose-lui de les finir à ta charge : ça ne lui coûte rien. S'il dit oui : identity.images ${groupes.map((g) => `keys = ${g.keys.join(", ")} ; images = ${g.images.join(", ")}`).join(" ; puis ")} (exactement ce qui manque${groupes.length > 1 ? ", un groupe à la fois" : ""}). La carte d'accord dit « À ma charge : 0 % de ton budget ». S'il demande aussi un autre logo d'une planche, ne lance pas d'abord celles à finir : un seul appel identity.images avec toutes ces planches et images = logo ; le Studio fait les logos dans l'ordre des identités (A, puis B, puis C), chacun recevant ceux refaits juste avant lui. Ensuite seulement, réponds à ce qu'il vient de dire.\n\n`;
}

/** Les planches regroupées par ce qui leur manque (une reprise refait les mêmes images sur chaque planche demandée). */
export function groupesAFinir(list: readonly PlancheAFinir[]): { keys: string[]; images: string[] }[] {
  // Les logos qui manquent partent ensemble, d'abord, dans l'ordre des identités (règle de la série : chacun reçoit ceux
  // refaits juste avant lui ; essai réel de Nadia, 23 novembre 2026). Ce qui manque d'autre suit, groupe par groupe.
  const sansLogo = list.filter((x) => x.manque.includes("logo"));
  if (sansLogo.length > 1 && new Set(sansLogo.map((x) => ORDRE.filter((s) => x.manque.includes(s)).join("+"))).size > 1) {
    const communes = ORDRE.filter((s) => sansLogo.every((x) => x.manque.includes(s)));
    const reste = list.map((x) => ({ ...x, manque: x.manque.filter((s) => !(sansLogo.includes(x) && (communes as string[]).includes(s))) })).filter((x) => x.manque.length);
    return [{ keys: sansLogo.map((x) => x.key).sort(), images: communes }, ...groupesAFinir(reste)];
  }
  const m = new Map<string, { keys: string[]; images: string[] }>();
  for (const x of list) {
    const images = ORDRE.filter((s) => x.manque.includes(s)), k = images.join("+");
    m.set(k, { keys: [...(m.get(k)?.keys ?? []), x.key], images });
  }
  // Le plus grand groupe d'abord.
  return [...m.values()].sort((a, b) => b.keys.length - a.keys.length);
}
