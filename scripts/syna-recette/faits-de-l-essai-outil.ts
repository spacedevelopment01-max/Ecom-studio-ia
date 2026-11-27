/**
 * LES FAITS À MONTRER DU CLIENT D'UN ESSAI (27 novembre 2026), sans aucun appel payant. Le chef d'orchestre joue le client :
 * ce script lui dit les questions que SINA poserait pour ce client (le cahier `docs/sina-savoir/questions-avant-la-marque.md`,
 * les parties choisies par le code d'après son activité et son offre), dans l'ordre, et enregistre ses réponses dans la
 * fiche de l'essai (le fichier du client, `CLIENT_JSON`, champ « faits »), avec les mêmes contrôles que le Studio : un sujet
 * de son métier, un produit parmi ses noms donnés, une valeur non vide pour un fait donné. Les scripts d'essai (planches,
 * planche en vrai) les lisent ensuite comme la fiche du Studio : les mentions vraies peuvent s'écrire, ce qu'il ne veut
 * pas montrer ne l'est jamais.
 */
import fs from "node:fs";

/** Une réponse du client, telle que le chef d'orchestre l'écrit. */
export type ReponseDuClient = { sujet: string; produit?: string; valeur?: string; noms?: string[]; etat?: "donne" | "ne_sait_pas" | "ne_montre_pas" };
type FichierDuClient = { metier?: string; kind?: string; produits?: string[]; faits?: unknown[] } & Record<string, unknown>;

/** L'activité et l'offre du client de l'essai, comme le Studio les garde au départ (`ficheDuClient`). */
const departDuClient = (c: FichierDuClient) => ({
  start: {
    business: { value: c.kind === "services" ? "services" : "products", status: "answered" as const, source: "client" as const, at: 0 },
    offer: { value: `${String(c.metier ?? "").trim()} : ${(c.produits ?? []).join(", ")}`, status: "answered" as const, source: "client" as const, at: 0 },
  },
});

export function lireLeClient(fichier: string): FichierDuClient {
  if (!fs.existsSync(fichier)) throw new Error(`Fichier du client introuvable (CLIENT_JSON) : ${fichier}. Rien n'est enregistré.`);
  const c = JSON.parse(fs.readFileSync(fichier, "utf8")) as FichierDuClient;
  if (!String(c.metier ?? "").trim() || (c.kind !== "produits" && c.kind !== "services")) throw new Error("Le fichier du client doit dire son métier (« metier ») et son type (« kind » : produits ou services). Rien n'est enregistré.");
  return c;
}

/** Les questions que SINA poserait encore à ce client, dans l'ordre, et ce qui est déjà répondu. */
export async function questionsDeLEssai(c: FichierDuClient): Promise<{ sujets: string[]; restent: { sujet: string; question: string; pour?: string[] }[]; connus: string; texte: string[] }> {
  const F = await import("../../src/lib/syna-agent/faits-a-montrer");
  const { faitsDuFichier } = await import("./client-de-l-essai");
  const j = departDuClient(c), faits = faitsDuFichier(c.faits ?? []);
  const sujets = F.sujetsDuParcours(j as never), l = F.lignesDesFaits(j as never, faits);
  const restent = l.restent.map((x) => ({ sujet: x.sujet, question: x.question, ...(x.produits ? { pour: x.produits } : {}) }));
  const texte = [
    `Parties du cahier pour ce client : ${F.partiesPour({ business: j.start.business.value, offre: j.start.offer.value }).map((p) => p.nom).join(", ")}.`,
    `Sujets, dans l'ordre : ${sujets.map((s) => s.sujet).join(", ")}.`,
    l.connus ? `Déjà répondu : ${l.connus}.` : "Rien n'est encore répondu.",
    ...(restent.length ? ["Questions que SINA poserait encore, une à la fois (le client peut répondre « je ne sais pas » ou « je préfère ne pas le montrer ») :", ...restent.map((x, i) => `${i + 1}. [${x.sujet}] ${x.question}${x.pour ? ` (pour ${x.pour.map((p) => `« ${p} »`).join(", ")})` : ""}`)] : ["Tous les faits à montrer sont répondus."]),
  ];
  return { sujets: sujets.map((s) => s.sujet), restent, connus: l.connus, texte };
}

/**
 * Ajoute les réponses du client à sa fiche d'essai, avec les contrôles du Studio (`start.fait`) ; une réponse du même sujet
 * (et du même produit) remplace la précédente. Rend le fichier mis à jour, sans l'écrire.
 */
export async function ajouterLesReponses(c: FichierDuClient, reponses: ReponseDuClient[]): Promise<FichierDuClient> {
  const F = await import("../../src/lib/syna-agent/faits-a-montrer");
  const { faitsDuFichier } = await import("./client-de-l-essai");
  const j = departDuClient(c), sujets = F.sujetsDuParcours(j as never);
  let faits = faitsDuFichier(c.faits ?? []);
  for (const r of reponses) {
    const etat = r.etat ?? "donne", s = sujets.find((x) => x.sujet === r.sujet);
    if (!s) throw new Error(`« ${r.sujet} » n'est pas un sujet de ce métier (${sujets.map((x) => x.sujet).join(", ")}) : rien n'est enregistré.`);
    if (etat === "donne" && r.sujet === "noms" && !(r.noms ?? []).some((n) => n.trim())) throw new Error("noms : donnez la liste des noms exacts (« noms »). Rien n'est enregistré.");
    if (etat === "donne" && r.sujet !== "noms" && !r.valeur?.trim()) throw new Error(`« ${r.sujet} » : la valeur est vide. Rien n'est enregistré.`);
    if (s.portee === "marque" && r.produit) throw new Error(`« ${r.sujet} » vaut pour la marque : sans produit. Rien n'est enregistré.`);
    const noms = r.sujet === "noms" && etat === "donne" ? (r.noms ?? []).map((n) => n.trim()).filter(Boolean) : F.nomsDonnes(faits);
    if (r.produit && !noms.some((n) => F.plat(n) === F.plat(r.produit!.trim()))) throw new Error(`« ${r.produit} » n'est pas l'un des noms donnés (${noms.map((n) => `« ${n} »`).join(", ") || "aucun"}) : donnez d'abord « noms ». Rien n'est enregistré.`);
    const f = { sujet: r.sujet, etat, at: Date.now(), ...(r.produit ? { produit: r.produit.trim() } : {}), ...(r.valeur?.trim() ? { valeur: r.valeur.trim() } : {}), ...(r.sujet === "noms" && etat === "donne" ? { noms } : {}) };
    const meme = (x: { sujet: string; produit?: string }) => x.sujet === f.sujet && F.plat(x.produit ?? "") === F.plat(f.produit ?? "");
    // Les noms changent : les faits des produits qui n'existent plus sont retirés (comme dans la fiche du Studio).
    if (r.sujet === "noms") faits = faits.filter((x) => !x.produit || (etat === "donne" && noms.some((n) => F.plat(n) === F.plat(x.produit!))));
    faits = [...faits.filter((x) => !meme(x)), f as never];
  }
  return { ...c, faits };
}
