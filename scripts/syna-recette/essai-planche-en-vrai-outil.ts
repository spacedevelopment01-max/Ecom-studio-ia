/**
 * L'essai réel de la planche en vrai (la planche de démonstration choisie, refaite à l'identique en haute définition) : la
 * partie qui se teste (appels simulés dans les essais). Le script à lancer est scripts/syna-recette/essai-planche-en-vrai.mts,
 * qui l'utilise ; son en-tête dit tout. Il n'appelle que les fonctions du Studio (planche-en-vrai.ts, planche-en-vrai-code.ts,
 * planche-en-vrai-tache.ts : `plancheEnVrai`, `vraisAppelsEnVrai`, `devisDeLaPlancheEnVrai`). Rien n'est relancé.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { LogosEnHdAi, PlancheEnVraiAi } from "../../src/lib/syna-agent/planche-en-vrai-tache";
import type { EtatPlancheEnVrai, Inventaire, Laquelle, NomElement, RelectureDuGroupe, VersionEnHd } from "../../src/lib/syna-agent/planche-en-vrai";
import type { StatutDuDomaine } from "../../src/lib/syna-agent/planche-de-marque";
import type { NameDomains } from "../../src/lib/syna-agent/brand-domains";
import { clientDeLEssai, euros, faitsDuFichier, faitsPermisDuClient, ficheDuClient, rangerLesFaitsDansLeProjet, typeDuProjet, type ClientDeLEssai } from "./client-de-l-essai";
import { aDesFaits } from "../../src/lib/syna-agent/faits-a-montrer";
import { lignesDeLArret, avisDuPlafond } from "./plafond-des-essais";
import { messageAvecCause } from "../../src/lib/ai/erreur-reseau";
import type { LigneDeDepense } from "./essai-planches-outil";
import { SEPARATEUR_DES_LIGNES, lignesDuTexte } from "../../src/lib/syna-agent/phrase-sous-le-nom";

export { clientDeLEssai, euros };
export type { ClientDeLEssai };

// ---------------------------------------------------------------- les entrées

/** Ce que la planche choisie porte déjà (son bloc 10) et ce que le code en garde : le domaine, l'année, la disposition, la phrase. */
/** `finitions` : les petites finitions notées par le relecteur sur la planche choisie (nettoyées par le code dans la planche en vrai). */
export type DonneesDeLaPlanche = { domaine: string | null; statut: StatutDuDomaine; annee: number; disposition: Laquelle; phrase: string; finitions?: string[] };

/** Ce que l'essai des planches a écrit pour la planche choisie (planche-X-resultat.json). */
/** `phrase` : les lignes de la phrase du logo de cette planche (planche-X-resultat.json), dans l'ordre. */
export type ResultatDeLaPlanche = { nom: string; domaine: string | null; statut: StatutDuDomaine; annee: number; disposition?: Laquelle; logo?: { fichier: string; sha256: string }; finitions?: string[]; phrase?: string[] };

/**
 * Le résultat de la planche choisie, écrit par l'essai des planches (RESULTAT_PLANCHE, planche-X-resultat.json) : le
 * domaine et son statut tels que la vérification du Studio les a trouvés avant le dessin, l'année du « © », la
 * disposition et le logo joint. Une planche qui n'a pas été gardée n'est jamais refaite.
 */
export function resultatDeLaPlanche(fichier: string): ResultatDeLaPlanche {
  if (!fs.existsSync(fichier)) throw new Error(`Résultat de la planche choisie introuvable (RESULTAT_PLANCHE) : ${fichier}. Rien n'est lancé.`);
  let r: { nom?: string; phrase?: unknown; disposition?: Laquelle; logo?: { fichier: string; sha256: string }; planche?: { image?: unknown; domaine?: string | null; statut?: StatutDuDomaine; annee?: number; finitions?: string[] } | null };
  try { r = JSON.parse(fs.readFileSync(fichier, "utf8")); } catch { throw new Error(`Résultat de la planche choisie illisible (RESULTAT_PLANCHE) : ${fichier}. Rien n'est lancé.`); }
  if (!r?.planche) throw new Error(`${fichier} n'est pas le résultat d'une planche de l'essai des planches : rien n'est lancé.`);
  if (!r.planche.image) throw new Error(`La planche de ${fichier} n'a pas été gardée par le relecteur : elle n'est jamais montrée, ni refaite en vrai. Rien n'est lancé.`);
  if (!r.planche.statut || !r.planche.annee) throw new Error(`${fichier} ne dit pas le domaine et l'année de la planche : rien n'est lancé.`);
  return { nom: String(r.nom ?? ""), domaine: r.planche.domaine ?? null, statut: r.planche.statut, annee: r.planche.annee, ...(r.disposition ? { disposition: r.disposition } : {}), ...(r.logo ? { logo: r.logo } : {}), ...(Array.isArray(r.planche.finitions) && r.planche.finitions.length ? { finitions: r.planche.finitions.map(String) } : {}), ...(Array.isArray(r.phrase) && r.phrase.length ? { phrase: r.phrase.map(String) } : {}) };
}

/**
 * Les données de la planche choisie, sans rien deviner et sans aucune valeur imposée : d'abord le résultat de la planche
 * choisie (RESULTAT_PLANCHE), sinon les variables DOMAINE, DOMAINE_STATUT (« disponible », « a_verifier » ou
 * « adresse_a_choisir »), ANNEE et DISPOSITION (« standard » ou « animaux », standard sans elle) ; PHRASE : la phrase que
 * porte le logo choisi (vide sans elle). Une variable donnée qui contredit le résultat fait tout refuser. Ce qui manque est
 * dit (voir `donneesVerifiees` pour un domaine vérifié par le Studio quand rien n'est donné).
 */
export function donneesDeLaPlanche(client: ClientDeLEssai, env: Record<string, string | undefined> = process.env): DonneesDeLaPlanche {
  const lu = env.RESULTAT_PLANCHE?.trim() ? resultatDeLaPlanche(env.RESULTAT_PLANCHE.trim()) : null;
  if (lu && lu.nom && lu.nom !== client.nom) throw new Error(`La planche choisie est celle de « ${lu.nom} », pas de « ${client.nom} » : rien n'est lancé.`);
  const donne = (k: string) => env[k]?.trim() || "";
  const contredit = (k: string, v: string, attendu: string | null | undefined) => { if (lu && v && attendu != null && v !== String(attendu)) throw new Error(`${k} (« ${v} ») contredit la planche choisie (« ${attendu} ») : rien n'est lancé.`); };
  contredit("DOMAINE", donne("DOMAINE"), lu?.domaine); contredit("DOMAINE_STATUT", donne("DOMAINE_STATUT"), lu?.statut); contredit("ANNEE", donne("ANNEE"), lu ? String(lu.annee) : null); contredit("DISPOSITION", donne("DISPOSITION"), lu?.disposition);
  const statut = (donne("DOMAINE_STATUT") || lu?.statut || (donne("DOMAINE") ? "disponible" : "")) as StatutDuDomaine;
  if (!["disponible", "a_verifier", "adresse_a_choisir"].includes(statut)) throw new Error("Statut du domaine manquant ou faux (RESULTAT_PLANCHE, ou DOMAINE_STATUT : « disponible », « a_verifier » ou « adresse_a_choisir ») : rien n'est lancé.");
  const domaine = donne("DOMAINE") || lu?.domaine || null;
  if (!domaine && statut !== "adresse_a_choisir") throw new Error("Domaine de la planche manquant (RESULTAT_PLANCHE, ou DOMAINE tel qu'il est écrit sur la planche choisie) : rien n'est lancé.");
  const annee = Number(donne("ANNEE") || (lu ? String(lu.annee) : ""));
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2200) throw new Error("Année de la planche manquante ou fausse (RESULTAT_PLANCHE, ou ANNEE, celle du « © » de la planche choisie) : rien n'est lancé.");
  const disposition = (donne("DISPOSITION") || lu?.disposition || "standard") as Laquelle;
  if (disposition !== "standard" && disposition !== "animaux") throw new Error("Disposition fausse (DISPOSITION : « standard » ou « animaux ») : rien n'est lancé.");
  // La phrase du logo : comparée par ses lignes, jamais par le « / » qui les sépare. PHRASE et le résultat de la planche
  // doivent dire les mêmes lignes ; sans PHRASE, celles du résultat.
  const donnee = lignesDuTexte(env.PHRASE ?? ""), duResultat = lu?.phrase?.flatMap((l) => lignesDuTexte(l)) ?? [];
  if (lu && env.PHRASE?.trim() && duResultat.length && donnee.join("\n") !== duResultat.join("\n")) throw new Error(`PHRASE (${donnee.map((l) => `« ${l} »`).join(" puis ")}) contredit la phrase de la planche choisie (${duResultat.map((l) => `« ${l} »`).join(" puis ")}) : rien n'est lancé.`);
  const lignes = donnee.length ? donnee : duResultat;
  return { domaine: statut === "adresse_a_choisir" ? null : domaine, statut, annee, disposition, phrase: lignes.join(SEPARATEUR_DES_LIGNES), ...(lu?.finitions?.length ? { finitions: lu.finitions } : {}) };
}

/**
 * Les données de la planche choisie, avec le domaine vérifié par le Studio quand ni le résultat de la planche ni le
 * domaine ne sont donnés : la vérification gratuite du Studio (`findDomains`, brand-domains.ts, annuaires RDAP), avec le
 * nom et le descripteur du client, lue comme la planche la lit (`domaineDeLaPlanche`), et l'année du Studio
 * (`anneeEnCours`) sans ANNEE. `trouver` : remplaçable par les essais (aucun réseau).
 */
export async function donneesVerifiees(client: ClientDeLEssai, env: Record<string, string | undefined> = process.env, trouver?: (nom: string, descripteur?: string | null) => Promise<NameDomains>): Promise<{ donnees: DonneesDeLaPlanche; verifie?: NameDomains }> {
  if (env.RESULTAT_PLANCHE?.trim() || env.DOMAINE?.trim() || env.DOMAINE_STATUT?.trim()) return { donnees: donneesDeLaPlanche(client, env) };
  const { findDomains } = await import("../../src/lib/syna-agent/brand-domains");
  const { domaineDeLaPlanche } = await import("../../src/lib/syna-agent/planche-de-marque");
  const { anneeEnCours } = await import("../../src/lib/syna-agent/planche-de-marque-tache");
  const verifie = await (trouver ?? findDomains)(client.nom, client.descripteur ?? null);
  const d = domaineDeLaPlanche(verifie, client.nom);
  return { donnees: donneesDeLaPlanche(client, { ...env, DOMAINE: d.domaine ?? "", DOMAINE_STATUT: d.statut, ANNEE: env.ANNEE?.trim() || String(anneeEnCours()) }), verifie };
}

/** Le logo donné est-il celui que la planche choisie a reçu ? (empreinte écrite par l'essai des planches). */
export function logoDeLaPlancheVerifie(env: Record<string, string | undefined>, logo: Buffer): void {
  const f = env.RESULTAT_PLANCHE?.trim();
  if (!f) return;
  const lu = resultatDeLaPlanche(f);
  if (lu.logo && crypto.createHash("sha256").update(logo).digest("hex") !== lu.logo.sha256) throw new Error(`Le logo donné n'est pas celui de la planche choisie (${lu.logo.fichier}) : rien n'est lancé.`);
}

// ---------------------------------------------------------------- le devis, sans aucun appel

export type LigneDuDevisEnVrai = {
  quoi: "inventaire" | "retouche" | "relecture" | "reprise d'une retouche" | "relecture de la reprise";
  /** La catégorie (le groupe de relecture) des retouches et des relectures. */
  categorie: string | null; appels: number; modele: string;
  quand: "toujours" | "si le relecteur refuse"; charge: "client" | "Studio";
  probableMicro: number; maxMicro: number;
};
export type DevisDeLEssaiEnVrai = {
  lignes: LigneDuDevisEnVrai[];
  /** Sans aucun refus : le probable du devis du Studio. */
  probableMicro: number;
  /** Si chaque image est refaite une fois, avec la relecture de son groupe. */
  probableAvecReprisesMicro: number;
  /** La somme des maxima de tous les appels possibles, reprises comprises : le plafond minimal pour aller au bout à coup sûr. */
  plafondMinimalMicro: number;
  /** En plus, au pire, si une réponse de texte mal formée doit être réparée (une fois par appel de texte, règle de llmJson). */
  reparationsMicro: number;
  /**
   * Le plafond conseillé : le plafond minimal, plus une réparation de l'inventaire et une réparation de relecture (les
   * réponses mal formées sont rares : chaque champ a sa valeur de secours), arrondi aux dix centimes du dessus.
   */
  plafondConseilleMicro: number;
  /** Le devis du Studio (`devisDeLaPlancheEnVrai`) : plafond du client, reprise et borne du Studio de la tâche. */
  devisDuStudio: { maxMicro: number; probableMicro: number; repriseMicro: number; repriseProbableMicro: number; studioMaxMicro: number; images: number };
};

/**
 * Le devis de l'essai, appel par appel, avec les fonctions du devis du Studio (aucun appel) : l'inventaire, les 17 retouches
 * par catégorie, les relectures par groupe, puis les reprises (chaque image refaite une fois avec la relecture de son
 * groupe, à la charge du Studio). Le garde-fou réserve le maximum de chaque appel : le plafond minimal est la somme des
 * maxima, c'est-à-dire le plafond du client plus la borne du Studio.
 */
export async function devisDeLEssaiEnVrai(): Promise<DevisDeLEssaiEnVrai> {
  const T = await import("../../src/lib/syna-agent/planche-en-vrai-tache");
  const P = await import("../../src/lib/syna-agent/planche-en-vrai");
  const { elementDeLaPlancheMaxMicro } = await import("../../src/lib/ai/media-providers");
  const { PERMISSION_DE_LA_PLANCHE_EN_VRAI } = await import("../../src/lib/ai/logo-policy");
  const { jsonCallMaxMicro } = await import("../../src/lib/ai/llm");
  const { EUR } = await import("../../src/lib/billing");
  const d = T.devisDeLaPlancheEnVrai();
  // Le prix d'un appel de texte, tiré du devis du Studio lui-même : le devis entier moins le devis où cet appel est déjà fait.
  const sans = (faits: string[]) => T.devisDeLaPlancheEnVrai(faits);
  const tous = [...P.NOMS_DES_ELEMENTS.map((n) => `brand:envrai:${n}`), ...P.GROUPES.map((g) => `brand:envrai:relecture:${g}`)];
  const inv = sans(tous);
  const rel = sans(["brand:envrai:inventaire", ...tous.filter((k) => k !== `brand:envrai:relecture:${P.GROUPES[0]}`)]);
  const nomDe = (a: "inventaire" | "relecture") => { const m = T.modeleDe(a); return `${m.provider}:${m.model} (effort ${m.effort})`; };
  const image = `openai:${PERMISSION_DE_LA_PLANCHE_EN_VRAI.model} (high)`;
  const lignes: LigneDuDevisEnVrai[] = [{ quoi: "inventaire", categorie: null, appels: 1, modele: nomDe("inventaire"), quand: "toujours", charge: "client", probableMicro: inv.probableMicro, maxMicro: inv.maxMicro }];
  const retouches = (g: string) => P.NOMS_DES_ELEMENTS.filter((n) => P.ELEMENTS[n].groupe === g);
  const somme = (noms: NomElement[], f: (n: NomElement) => number) => noms.reduce((s, n) => s + f(n), 0);
  const maxDe = (n: NomElement) => elementDeLaPlancheMaxMicro(P.ELEMENTS[n].taille, 3), probableDe = (n: NomElement) => Math.round(T.PRIX_MESURES[n] * EUR);
  for (const g of P.GROUPES) lignes.push({ quoi: "retouche", categorie: P.NOM_DU_GROUPE[g], appels: retouches(g).length, modele: image, quand: "toujours", charge: "client", probableMicro: somme(retouches(g), probableDe), maxMicro: somme(retouches(g), maxDe) });
  for (const g of P.GROUPES) lignes.push({ quoi: "relecture", categorie: P.NOM_DU_GROUPE[g], appels: 1, modele: nomDe("relecture"), quand: "toujours", charge: "client", probableMicro: rel.probableMicro, maxMicro: rel.maxMicro });
  for (const g of P.GROUPES) lignes.push({ quoi: "reprise d'une retouche", categorie: P.NOM_DU_GROUPE[g], appels: retouches(g).length, modele: image, quand: "si le relecteur refuse", charge: "Studio", probableMicro: somme(retouches(g), probableDe), maxMicro: somme(retouches(g), maxDe) });
  for (const g of P.GROUPES) lignes.push({ quoi: "relecture de la reprise", categorie: P.NOM_DU_GROUPE[g], appels: 1, modele: nomDe("relecture"), quand: "si le relecteur refuse", charge: "Studio", probableMicro: rel.probableMicro, maxMicro: rel.maxMicro });
  const total = (f: (l: LigneDuDevisEnVrai) => boolean, k: "probableMicro" | "maxMicro") => lignes.filter(f).reduce((s, l) => s + l[k], 0);
  // Une réparation de réponse (llmJson) : la réponse renvoyée et la consigne en plus à l'entrée, même limite de sortie.
  const reparation = (a: "inventaire" | "relecture") => {
    const c = T.APPELS_EN_VRAI[a], m = T.modeleDe(a), un = a === "inventaire" ? inv.maxMicro : rel.maxMicro;
    return Math.max(0, (jsonCallMaxMicro(m.provider, m.model, c.input * 1.5, c.max, c.max, m.effort || null)?.maxMicro ?? un) - un);
  };
  const plafondMinimalMicro = Math.ceil(total(() => true, "maxMicro"));
  const reparationsMicro = Math.ceil(reparation("inventaire") + 2 * P.GROUPES.length * reparation("relecture"));
  return {
    lignes,
    probableMicro: Math.ceil(total((l) => l.quand === "toujours", "probableMicro")),
    probableAvecReprisesMicro: Math.ceil(total(() => true, "probableMicro")),
    plafondMinimalMicro,
    reparationsMicro,
    plafondConseilleMicro: Math.ceil((plafondMinimalMicro + reparation("inventaire") + reparation("relecture")) / 100_000) * 100_000,
    devisDuStudio: d,
  };
}

/** Le devis en texte, pour le rapport et la console. */
export function devisEnTexteEnVrai(d: DevisDeLEssaiEnVrai): string[] {
  return [
    "Devis de l'essai de la planche en vrai (fonctions du devis du Studio, aucun appel) :",
    ...d.lignes.map((x) => `- ${x.quoi}${x.categorie ? ` · ${x.categorie}` : ""} · ${x.appels} appel${x.appels > 1 ? "s" : ""} · ${x.modele} · ${x.quand} · charge ${x.charge} · probable ${euros(x.probableMicro)} · au plus ${euros(x.maxMicro)}`),
    `Probable, sans refus : ${euros(d.probableMicro)} (devis du Studio : ${euros(d.devisDuStudio.probableMicro)})`,
    `Probable, si chaque image est refaite une fois : ${euros(d.probableAvecReprisesMicro)}`,
    `Plafond minimal pour aller au bout à coup sûr (somme des maxima, reprises comprises) : ${euros(d.plafondMinimalMicro)}`,
    `  dont plafond du client de la tâche ${euros(d.devisDuStudio.maxMicro)} et borne du Studio ${euros(d.devisDuStudio.studioMaxMicro)} (devisDeLaPlancheEnVrai)`,
    `Hors plafond minimal : une réponse de texte mal formée à réparer coûterait au plus ${euros(d.reparationsMicro)} de plus en tout.`,
    `Plafond conseillé (plafond minimal, une réparation de l'inventaire et une de relecture, arrondi) : ${euros(d.plafondConseilleMicro)}`,
  ];
}

// ---------------------------------------------------------------- le parcours du projet, comme la vraie tâche

/** Les médias qu'un état de la planche en vrai désigne : la démonstration, le logo, la planche, les images, les logos, les favicons. */
export function idsDeLEtat(etat: EtatPlancheEnVrai): { quoi: string; id: string }[] {
  return [
    { quoi: "planche choisie", id: etat.demo }, { quoi: "logo fini", id: etat.logo },
    ...(etat.planche ? [{ quoi: "planche en vrai", id: etat.planche.id }] : []),
    ...etat.elements.filter((e) => e.id).map((e) => ({ quoi: `image ${e.element}`, id: e.id! })),
    ...etat.logos.map((l) => ({ quoi: `logo ${l.version}`, id: l.id })),
    ...Object.entries(etat.favicons ?? {}).map(([k, id]) => ({ quoi: `favicon ${k}`, id })),
  ];
}

/**
 * Chaque média désigné par l'état existe dans ce projet, avec son fichier lisible. Rend la liste de ce qui manque (vide :
 * tout est là). Rien n'est réparé ni deviné.
 */
export async function fichiersManquants(projectId: string, etat: EtatPlancheEnVrai): Promise<string[]> {
  const { projectAsset, assetData } = await import("../../src/lib/library");
  const manque: string[] = [];
  for (const x of idsDeLEtat(etat)) {
    try { if (!assetData(projectAsset(projectId, x.id)).length) manque.push(`${x.quoi} (${x.id}) : fichier vide`); } catch { manque.push(`${x.quoi} (${x.id})`); }
  }
  return manque;
}

/**
 * LE PARCOURS DU PROJET, écrit comme le font le choix de l'identité (`identity.choose`) et la fin de la marque
 * (`brand-finish.ts`), avec les fonctions du Studio : le fil du projet (`threadFor`), `updateJourney` et `setStep`
 * (journey.ts), `brandFromIdentity` et `saveBrand`, et la marque relue sur la planche en vrai comme dans
 * planche-en-vrai-tache.ts (palette mesurée, polices lues, symbole). Il pose : l'identité A (`identities`) avec sa planche
 * de démonstration, son choix (`identityChoice`), la marque finie (`brandFinish`, avec ce que SINA dit) et `plancheEnVrai`.
 *
 * L'identité n'a que ce que l'essai connaît (le nom, la phrase, la palette mesurée, les polices lues, la planche) : les
 * textes que la chaîne de la marque écrit d'habitude (promesse, idée, mots de la maison) restent vides, jamais inventés.
 * Le fil d'un vrai parcours est ouvert AVANT son projet (le brouillon de l'étape 0) ; un fil ouvert plus tard serait lu
 * comme celui d'un projet existant, hors parcours : sa date est donc ramenée à celle du projet, une seule fois.
 */
export async function enregistrerLeParcours(o: { userId: string; projectId: string; nom: string; etat: EtatPlancheEnVrai; donnees: DonneesDeLaPlanche }): Promise<{ conversationId: string }> {
  const { one, run } = await import("../../src/lib/db");
  const { threadFor } = await import("../../src/lib/syna-agent/thread");
  const { setStep, updateJourney } = await import("../../src/lib/syna-agent/journey");
  const { brandFromIdentity } = await import("../../src/lib/syna-agent/tools/identity");
  const { loadProject, saveBrand } = await import("../../src/lib/projects");
  const { rolesDeLaPalette } = await import("../../src/lib/syna-agent/planche-en-vrai-code");
  const { assetData, getAsset } = await import("../../src/lib/library");
  const sharp = (await import("sharp")).default;
  type User = import("../../src/lib/auth").User;
  const user = one<User>("SELECT id, email, name, role, timezone, created_at FROM users WHERE id=?", o.userId);
  if (!user) throw new Error(`Compte ${o.userId} introuvable : rien n'est écrit.`);
  const cid = threadFor(user, o.projectId);
  const st = JSON.parse(one<{ state_json: string | null }>("SELECT state_json FROM agent_conversations WHERE id=?", cid)?.state_json ?? "{}");
  if (!st.parcours) run("UPDATE agent_conversations SET created_at=(SELECT created_at FROM projects WHERE id=?) WHERE id=?", o.projectId, cid);

  const etat = o.etat, roles = rolesDeLaPalette(etat.palette.map((p) => p.hex), "#1C2A24");
  // La planche choisie et le logo fini, à leurs vraies tailles (le logo fini tient sa place sur la planche, comme après la
  // méthode des graphistes : sans lui, la planche serait lue comme incomplète et jamais montrée).
  const taille = async (id: string) => { const a = getAsset(id); const m = a ? await sharp(assetData(a)).metadata() : null; return { id, w: m?.width ?? 1, h: m?.height ?? 1 }; };
  const dims = await taille(etat.demo), logoFini = await taille(etat.logo);
  const at = etat.at || Date.now();
  const identite = {
    key: "A" as const, name: o.nom, nameStyle: "", nameWhy: "", nameAnchor: "", nameTest: "", nameExpression: "", nameCandidates: [],
    slogan: lignesDuTexte(o.donnees.phrase).join(" "), sloganTone: "", promise: "", territory: "", ground: "blanc" as const, palette: roles, paletteFamily: "",
    fonts: { heading: etat.polices?.titres.handle ?? "inter_n7", body: etat.polices?.textes.handle ?? "inter_n4" }, fontStyle: "",
    tone: { adjectives: [], avoid: [] }, logoStyle: "lettrage" as const, logoIdea: "", why: "",
    board: {
      idea: { belief: "", confession: "", confessionSupport: 0, enemy: "", proof: "", cost: "" }, nameCheck: "non_verifie" as const,
      lines: [], toProve: [], voice: { sliders: [], thisNotThat: [], houseWords: [], bannedWords: [] }, signs: [],
      wordmark: { case: "asis" as const, tracking: 0, align: "gauche" as const, dot: false, symbolPlace: "gauche" as const },
      object: { kind: "carte" as const, front: [o.nom], back: [] },
      images: { logo: logoFini },
      planche: { image: dims, logo: etat.logo, domaine: o.donnees.domaine, statut: o.donnees.statut, annee: o.donnees.annee, essais: 1, at, ...(o.donnees.finitions?.length ? { finitions: o.donnees.finitions } : {}) },
    },
  } as unknown as import("../../src/lib/syna-agent/identities").Identity;

  const j = updateJourney(cid, (x) => {
    x.identities = { list: [identite], issues: [], comparison: "", at, round: 1 };
    x.identityChoice = { key: "A", mix: {}, at };
    x.brandFinish = { prepaidMicro: 0, at, issues: etat.issues, logoFrom: etat.logo };
    x.plancheEnVrai = etat;
    setStep(x, 0, "done"); setStep(x, 1, "done"); setStep(x, 2, "done"); setStep(x, 3, "todo");
  });
  // La marque du projet : celle du choix de l'identité, puis relue sur la planche en vrai (planche-en-vrai-tache.ts).
  const symbole = one<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND role='logo-mark' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", o.projectId)?.id;
  const b = brandFromIdentity(loadProject(o.projectId), identite, j, [], etat.logo);
  saveBrand(o.projectId, { ...b, palette: { ...b.palette, ...roles }, fonts: identite.fonts, logo: { ...b.logo, ...(symbole ? { markAssetId: symbole } : {}) } });
  // La fin de la marque, comme brand-finish.ts : la charte (gratuite, rendue par le Studio), puis l'étape « Image de marque
  // complète » en attente de la validation du client (« review ») ; sans charte, elle reste à faire. Les étapes suivantes
  // (les angles, l'activité, le site…) restent à faire : rien ne fait croire que le site est fait.
  const { buildBrandKit } = await import("../../src/lib/syna-agent/brand-kit");
  let kit: Awaited<ReturnType<typeof buildBrandKit>> | null = null;
  try { kit = await buildBrandKit(o.projectId); } catch { kit = null; }
  updateJourney(cid, (x) => { if (kit) { x.brandKit = kit; setStep(x, 3, "review"); } else setStep(x, 3, "todo"); });
  return { conversationId: cid };
}

// ---------------------------------------------------------------- l'essai

export type EssaiDeCase = { tour: number; texte?: string; jointes?: { role: string; fichier: string }[]; brute?: string; recu?: string; raisons?: string[]; verdict?: unknown };
export type CaseDeLEssai = { element: NomElement; essais: EssaiDeCase[]; gardee?: boolean; fichierHd?: string; ambiance?: boolean; raison?: string };
export type ResultatEnVrai = {
  arret?: string; client: ClientDeLEssai; donnees: DonneesDeLaPlanche;
  apercus: string[]; refusALaDecoupe: { case: string; raison: string }[];
  inventaire?: Inventaire;
  cases: CaseDeLEssai[];
  relectures: { cle: string; groupe: string; tour: number; verdict: RelectureDuGroupe; fichier: string }[];
  etat?: EtatPlancheEnVrai;
  planche?: { fichier: string; w: number; h: number };
  logos: string[];
  depenseMicro: number; appels: LigneDeDepense[]; devis: DevisDeLEssaiEnVrai;
  /** Le projet de l'essai et le fil où son parcours est enregistré (l'onglet Marque le lit). */
  projectId?: string; conversationId?: string;
  /**
   * LOGO_HD sur le chemin normal : les quatre petites versions du logo reprises de l'aperçu (sans symbole séparable),
   * refaites en haute définition après la planche en vrai, à la charge du Studio (`refaireLesLogosEnHdEnVrai`). Vide :
   * aucune version reprise de l'aperçu (symbole séparable), rien à refaire.
   */
  logosEnHd?: { versions: VersionEnHd[]; gardees: VersionEnHd[]; refusees: VersionEnHd[]; surLaPlanche?: string[]; devis: { maxMicro: number; probableMicro: number } };
  /**
   * REPRENDRE=1 : la passe reprise (son numéro, archivée dans passe-N/), ce qui a été repris sans appel, les appels partis
   * sans réponse à la passe d'avant et refaits parce que le propriétaire a relancé, les écarts notés, la dépense d'avant.
   */
  reprise?: { passe: number; reprises: string[]; refaits: string[]; ecarts: string[]; depensePrecedenteMicro: number; depenseDesPassesArchiveesMicro: number; incertainMicro: number; sansReponse: string[] };
};
/**
 * Comment reprendre un essai arrêté, en lignes pour le rapport et la console : la même commande, même dossier de sortie, avec
 * REPRENDRE=1. Ce qui est reçu est gardé, jamais redemandé ; un appel au résultat incertain n'est jamais relancé tout seul.
 */
export function lignesPourReprendre(res: Pick<ResultatEnVrai, "arret" | "inventaire" | "cases" | "relectures">, noms: readonly NomElement[], o: { incertain: boolean }): string[] {
  const recues = res.cases.filter((c) => c.essais.some((e) => e.brute)).map((c) => c.element);
  const sansReponse = res.cases.filter((c) => c.essais.some((e) => e.texte && !e.brute)).map((c) => c.element);
  const restent = noms.filter((n) => !recues.includes(n));
  return [
    "Comment reprendre : la même commande, même dossier de sortie, avec REPRENDRE=1 en plus (et un plafond pour ce qui reste ; devis gratuit : DEVIS_SEULEMENT=1 REPRENDRE=1, même commande).",
    `  Gardé, jamais redemandé ni repayé : ${[res.inventaire ? "l'inventaire" : null, ...recues.map((n) => `l'image ${n}`), ...res.relectures.map((r) => `la relecture ${r.groupe} (essai ${r.tour})`)].filter(Boolean).join(", ") || "rien encore"}.`,
    `  Fait à la reprise : ${restent.length ? `les images ${restent.join(", ")}, ` : ""}les relectures qui manquent, les reprises éventuelles, LOGO_HD s'il est demandé, puis les logos, la palette, les polices, l'assemblage, etat.json, essai.json et le parcours.`,
    ...(o.incertain && sansReponse.length ? [`  Résultat incertain : l'appel de ${sansReponse.join(", ")} est parti sans réponse ; son coût maximal est retenu. Il n'est jamais relancé tout seul : il ne sera refait que si tu relances toi-même avec REPRENDRE=1, après avoir vérifié la consommation chez le fournisseur.`] : []),
  ];
}
/**
 * Le devis du chemin normal avec LOGO_HD (aucun appel) : la planche en vrai, puis les quatre petites versions du logo en
 * haute définition, à la charge du Studio, reprise des refusées comprise. Le plafond minimal exact est la somme des deux.
 */
export async function devisDuCheminNormal(o: { logoHd?: boolean } = {}): Promise<{ planche: DevisDeLEssaiEnVrai; logos: ReturnType<typeof import("../../src/lib/syna-agent/planche-en-vrai-tache").devisDesLogosEnHd> | null; plafondMinimalMicro: number; probableMicro: number; probableAvecReprisesMicro: number; texte: string[] }> {
  const T = await import("../../src/lib/syna-agent/planche-en-vrai-tache");
  const planche = await devisDeLEssaiEnVrai(), logos = o.logoHd ? T.devisDesLogosEnHd() : null;
  const plafondMinimalMicro = planche.plafondMinimalMicro + (logos?.maxMicro ?? 0);
  const probableMicro = planche.probableMicro + (logos?.probableMicro ?? 0), probableAvecReprisesMicro = planche.probableAvecReprisesMicro + (logos?.siToutEstRefaitMicro ?? 0);
  return {
    planche, logos, plafondMinimalMicro, probableMicro, probableAvecReprisesMicro,
    texte: [...devisEnTexteEnVrai(planche), ...(logos ? [
      `LOGO_HD, sur le chemin normal, à la charge du Studio : les quatre petites versions du logo (compact, icône, favicon, badge), seulement celles reprises de l'aperçu, ${logos.images} images et ${logos.relectures} relecture, puis une reprise des refusées ; probable ${euros(logos.probableMicro)} (si tout est refait une fois : ${euros(logos.siToutEstRefaitMicro)}), au plus ${euros(logos.maxMicro)}`,
      `Plafond minimal exact de la commande (planche en vrai et LOGO_HD, somme des maxima, reprises comprises) : ${euros(plafondMinimalMicro)} ; probable ${euros(probableMicro)} (si tout est refait une fois : ${euros(probableAvecReprisesMicro)})`,
    ] : [])],
  };
}
// ---------------------------------------------------------------- la reprise d'une première passe interrompue

/**
 * LA REPRISE D'UNE PREMIÈRE PASSE INTERROMPUE (REPRENDRE=1, 26 novembre 2026 ; essai réel de Mouture arrêté à la sixième
 * image sur une erreur de connexion du fournisseur). Ce que la passe d'avant a écrit dans le dossier de sortie, relu sans
 * aucun appel : l'inventaire reçu, chaque image reçue (cases/<case>-<tour>-hd.png, avec son texte envoyé et son reçu), chaque
 * relecture reçue (relectures/<groupe>-<tour>-verdict.json) et, avec LOGO_HD, chaque logo reçu et sa relecture (logos-hd/).
 * Ce qui est déjà reçu et payé n'est jamais redemandé : la même commande avec REPRENDRE=1, même dossier de sortie, le
 * reprend tel quel. Un appel parti sans réponse (texte envoyé, aucune image : un résultat incertain, coût maximal retenu)
 * n'est jamais relancé tout seul : il n'est refait que parce que le propriétaire relance lui-même avec REPRENDRE=1.
 */
export type PassePrecedente = {
  /** Le numéro de cette passe archivée (passe-N/ : son rapport, sa dépense, ses appels sans réponse). */
  numero: number;
  inventaire: Inventaire | null;
  /** La demande de l'inventaire telle qu'elle est partie (sans les empreintes des images). */
  demandeDeLInventaire: string | null;
  /** Les images reçues, par « case-tour ». */
  images: Map<string, { png: Buffer; texte: string | null; recu: unknown; fichier: string; jointes: Map<string, string> }>;
  /** Les relectures reçues, par « groupe-tour ». */
  relectures: Map<string, RelectureDuGroupe>;
  /** LOGO_HD : les images reçues et les relectures reçues, par clé d'appel (logo-hd-badge, relecture-logos-hd, -r1). */
  logosHd: { images: Map<string, Buffer>; relectures: Map<string, unknown> };
  /** Les appels partis sans réponse reçue (« case-tour ») : résultat incertain ou échec. */
  sansReponse: string[];
  /** Les empreintes de la planche choisie et du logo fini de la passe d'avant (lues dans son rapport). */
  plancheSha: string | null; logoSha: string | null;
  /** Ce que la passe d'avant a compté (réglé, plus les coûts maximaux retenus des résultats incertains). */
  depenseMicro: number; incertainMicro: number;
  /** Ce que les passes déjà archivées (passe-1/, passe-2/…) ont compté : une deuxième reprise les compte aussi dans « en tout ». */
  depenseDesPassesArchiveesMicro: number;
  /** Le rejugement gratuit de cette passe (REJUGER=1, rejugement.json), s'il a été fait : les images déclarées périmées. */
  rejugement?: Rejugement;
};

const lireJson = (f: string): unknown => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } };
/** La partie d'une demande écrite qui ne dépend pas des octets des images (la consigne, la demande et les libellés joints). */
const demandeSansEmpreintes = (s: string) => s.replace(/ \(\d+ octets, sha256 [0-9a-f]+\)/g, "");

/** Ce que la passe d'avant a laissé dans le dossier de sortie ; null s'il n'y a rien à reprendre. */
export function passePrecedente(sortie: string): PassePrecedente | null {
  if (!fs.existsSync(sortie)) return null;
  const f = (...p: string[]) => path.join(sortie, ...p);
  const liste = (d: string) => (fs.existsSync(f(d)) ? fs.readdirSync(f(d)) : []);
  const inventaire = fs.existsSync(f("inventaire-reponse.json")) ? (lireJson(f("inventaire-reponse.json")) as Inventaire | null) : null;
  const demandeDeLInventaire = inventaire && fs.existsSync(f("inventaire-demande.txt")) ? demandeSansEmpreintes(fs.readFileSync(f("inventaire-demande.txt"), "utf8")) : null;
  const images: PassePrecedente["images"] = new Map(), sansReponse: string[] = [];
  const cases = liste("cases");
  for (const nom of cases) {
    const m = /^(.+-\d)-texte-envoye\.txt$/.exec(nom);
    if (!m) continue;
    const base = m[1];
    if (!cases.includes(`${base}-hd.png`)) { sansReponse.push(base); continue; }
    const jointes = new Map<string, string>();
    for (const j of cases) { const mj = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-jointe-\\d+-(.+)\\.png$`).exec(j); if (mj) jointes.set(mj[1], crypto.createHash("sha256").update(fs.readFileSync(f("cases", j))).digest("hex")); }
    images.set(base, { png: fs.readFileSync(f("cases", `${base}-hd.png`)), texte: fs.readFileSync(f("cases", nom), "utf8"), recu: cases.includes(`${base}-recu.json`) ? lireJson(f("cases", `${base}-recu.json`)) : null, fichier: `cases/${base}-hd.png`, jointes });
  }
  const relectures: PassePrecedente["relectures"] = new Map();
  for (const nom of liste("relectures")) {
    const m = /^(.+-\d)-verdict\.json$/.exec(nom);
    const v = m ? (lireJson(f("relectures", nom)) as { verdict?: RelectureDuGroupe } | null)?.verdict : null;
    if (m && v) relectures.set(m[1], v);
  }
  const logosHd: PassePrecedente["logosHd"] = { images: new Map(), relectures: new Map() };
  for (const nom of liste("logos-hd")) {
    const mi = /^(.+)-recue\.png$/.exec(nom), mv = /^(.+)-verdict\.json$/.exec(nom);
    if (mi) logosHd.images.set(mi[1], fs.readFileSync(f("logos-hd", nom)));
    if (mv) { const v = lireJson(f("logos-hd", nom)); if (v) logosHd.relectures.set(mv[1], v); }
  }
  const rapport = fs.existsSync(f("rapport.txt")) ? fs.readFileSync(f("rapport.txt"), "utf8") : "";
  const plancheSha = /^Planche choisie : .*\(sha256 ([0-9a-f]{64})\)/m.exec(rapport)?.[1] ?? null;
  const logoSha = /^Logo fini : .*\(sha256 ([0-9a-f]{64})\)/m.exec(rapport)?.[1] ?? null;
  const depense = (lireJson(f("depense.json")) as { reelMicro?: number | null; reserveMicro?: number; statut?: string }[] | null) ?? [];
  const depenseMicro = depense.reduce((s, a) => s + (a.reelMicro ?? a.reserveMicro ?? 0), 0);
  const incertainMicro = depense.filter((a) => a.statut === "uncertain").reduce((s, a) => s + (a.reelMicro ?? a.reserveMicro ?? 0), 0);
  if (!inventaire && !images.size && !relectures.size && !sansReponse.length && !rapport) return null;
  const archivees = liste(".").filter((d) => /^passe-\d+$/.test(d));
  const numero = 1 + archivees.length;
  const depenseDesPassesArchiveesMicro = archivees.reduce((s, d) => s + ((lireJson(f(d, "depense.json")) as { reelMicro?: number | null; reserveMicro?: number }[] | null) ?? []).reduce((t, a) => t + (a.reelMicro ?? a.reserveMicro ?? 0), 0), 0);
  const rj = lireJson(f("rejugement.json")) as Rejugement | null;
  return { numero, inventaire, demandeDeLInventaire, images, relectures, logosHd, sansReponse: sansReponse.sort(), plancheSha, logoSha, depenseMicro, incertainMicro, depenseDesPassesArchiveesMicro, ...(rj && rj.passe === numero && Array.isArray(rj.perimees) ? { rejugement: rj } : {}) };
}

/**
 * Le devis de ce qui reste après la passe d'avant (aucun appel), avec la fonction du devis du Studio (`devisDeLaPlancheEnVrai`
 * avec ses points de reprise faits) : l'inventaire et les images reçues ne sont pas repayés. Les reprises à la charge du
 * Studio restent toutes possibles (une image reçue peut être refusée à sa relecture), LOGO_HD est compté en entier.
 */
export async function devisDeLaReprise(prec: PassePrecedente, o: { logoHd?: boolean } = {}): Promise<{ faits: string[]; probableMicro: number; probableAvecReprisesMicro: number; plafondMinimalMicro: number; plafondConseilleMicro: number; texte: string[] }> {
  const T = await import("../../src/lib/syna-agent/planche-en-vrai-tache");
  const P = await import("../../src/lib/syna-agent/planche-en-vrai");
  const { plafondConseilleMicro } = await import("./plafond-des-essais");
  // Après REJUGER=1 : ce qui reste est ce que le rejugement a compté (les reprises des images à refaire, leurs relectures,
  // LOGO_HD), recompté ici avec les fonctions du devis du Studio.
  if (prec.rejugement) {
    const rj = prec.rejugement, reprises = T.devisDesReprisesEnVrai(rj.aRefaire.map((x) => x.element)), logos = o.logoHd ? T.devisDesLogosEnHd() : null;
    const probableMicro = reprises.probableMicro + (logos?.probableMicro ?? 0), plafondMinimalMicro = reprises.maxMicro + (logos?.maxMicro ?? 0);
    return {
      faits: [], probableMicro, probableAvecReprisesMicro: probableMicro + (logos ? logos.siToutEstRefaitMicro - logos.probableMicro : 0), plafondMinimalMicro, plafondConseilleMicro: plafondConseilleMicro(probableMicro),
      texte: [
        `Reprise de la passe ${prec.numero} après le rejugement gratuit (REJUGER=1, rejugement.txt) : gardées sans appel ${rj.gardees.map((g) => g.element).join(", ") || "aucune"}.`,
        `Restent : ${reprises.images} image(s) refaite(s) une fois à la charge du Studio (${rj.aRefaire.map((x) => x.element).join(", ") || "aucune"}), ${reprises.relectures} relecture(s)${logos ? ", puis LOGO_HD (4 images et 1 relecture, à la charge du Studio)" : ""}.`,
        ...(rj.perimees.length ? [`Images reçues avec la consigne d'avant, périmées, rangées à part et refaites : ${rj.perimees.join(", ")}.`] : []),
        ...(prec.sansReponse.length ? [`Appel(s) parti(s) sans réponse à la passe ${prec.numero} (résultat incertain, coût maximal retenu : ${euros(prec.incertainMicro)}) : ${prec.sansReponse.join(", ")}. Jamais relancé tout seul : refait seulement parce que tu relances toi-même avec REPRENDRE=1.`] : []),
        `Probable de ce qui reste : ${euros(probableMicro)} ; somme des maxima de ce qui reste : ${euros(plafondMinimalMicro)}.`,
        `Plafond conseillé : ${euros(plafondConseilleMicro(probableMicro))} (deux fois le probable, arrondi). Déjà compté : ${euros(prec.depenseDesPassesArchiveesMicro + prec.depenseMicro)} en tout.`,
      ],
    };
  }
  const faits = [
    ...(prec.inventaire ? ["brand:envrai:inventaire"] : []),
    ...P.NOMS_DES_ELEMENTS.filter((n) => prec.images.has(`${n}-1`)).map((n) => `brand:envrai:${n}`),
    ...P.GROUPES.filter((g) => prec.relectures.has(`${g}-1`)).map((g) => `brand:envrai:relecture:${g}`),
  ];
  const plein = await devisDeLEssaiEnVrai(), tout = T.devisDeLaPlancheEnVrai(), reste = T.devisDeLaPlancheEnVrai(faits);
  const logos = o.logoHd ? T.devisDesLogosEnHd() : null;
  const plafondMinimalMicro = plein.plafondMinimalMicro - (tout.maxMicro - reste.maxMicro) + (logos?.maxMicro ?? 0);
  const probableMicro = reste.probableMicro + (logos?.probableMicro ?? 0);
  const probableAvecReprisesMicro = probableMicro + reste.repriseProbableMicro + (logos ? logos.siToutEstRefaitMicro - logos.probableMicro : 0);
  const restent = P.NOMS_DES_ELEMENTS.filter((n) => !prec.images.has(`${n}-1`));
  return {
    faits, probableMicro, probableAvecReprisesMicro, plafondMinimalMicro, plafondConseilleMicro: plafondConseilleMicro(probableMicro),
    texte: [
      `Reprise de la passe ${prec.numero} (REPRENDRE=1, devis du Studio, aucun appel) : déjà reçus et payés, jamais redemandés : ${[prec.inventaire ? "l'inventaire" : null, ...P.NOMS_DES_ELEMENTS.filter((n) => prec.images.has(`${n}-1`))].filter(Boolean).join(", ") || "rien"}.`,
      `Restent : ${restent.length} image(s) (${restent.join(", ") || "aucune"}), ${P.GROUPES.length - P.GROUPES.filter((g) => prec.relectures.has(`${g}-1`)).length} relecture(s)${logos ? ", puis LOGO_HD (4 images et 1 relecture, à la charge du Studio)" : ""}.`,
      ...(prec.sansReponse.length ? [`Appel(s) parti(s) sans réponse à la passe ${prec.numero} (résultat incertain, coût maximal retenu : ${euros(prec.incertainMicro)}) : ${prec.sansReponse.join(", ")}. Jamais relancé tout seul : refait seulement parce que tu relances toi-même avec REPRENDRE=1.`] : []),
      `Probable de ce qui reste : ${euros(probableMicro)} (si chaque image est refaite une fois : ${euros(probableAvecReprisesMicro)}) ; somme des maxima de ce qui reste, reprises comprises : ${euros(plafondMinimalMicro)}.`,
      `Plafond conseillé : ${euros(plafondConseilleMicro(probableMicro))} (deux fois le probable, arrondi). Déjà compté à la passe ${prec.numero} : ${euros(prec.depenseMicro)}${prec.depenseDesPassesArchiveesMicro ? ` ; avec les passes d'avant, en tout : ${euros(prec.depenseDesPassesArchiveesMicro + prec.depenseMicro)}` : ""}.`,
    ],
  };
}

/** La reprise refusée avant tout appel (la planche, le logo ou une demande ont changé depuis la passe d'avant). */
export class RepriseRefusee extends Error { constructor(m: string) { super(m); this.name = "RepriseRefusee"; } }

// ---------------------------------------------------------------- le rejugement gratuit (REJUGER=1)

/**
 * LE REJUGEMENT GRATUIT D'UNE PASSE (REJUGER=1, 26 novembre 2026, essai réel de Mouture, étape 5). Aucun appel : les images
 * déjà reçues et les verdicts déjà reçus sont relus, et chaque image est jugée de nouveau par le code d'aujourd'hui
 * (`raisonsDuRefusEnVrai` : les textes du logo jamais en trop, les faits et les produits inventés reconnus). Ce qu'il peut
 * rejuger : tout ce que le relecteur a écrit (ses textes lus, sa note, ses cases cochées). Ce qu'il ne peut pas : un texte
 * que le relecteur n'a pas recopié, ou un défaut qu'il n'a pas vu ; pour cela, `aLOeil` marque à refaire une image vue au
 * contrôle, avec sa raison. Il écrit rejugement.json : les images gardées, celles à refaire (avec leurs raisons
 * d'aujourd'hui et celles d'alors), celles refusées deux fois (l'aperçu garde sa case) et les images reçues avec la
 * consigne d'avant et jamais relues, déclarées périmées : la reprise suivante (REPRENDRE=1) les range à part et les refait
 * avec la consigne d'aujourd'hui, parce que le propriétaire relance lui-même. Le devis de ce qui reste suit.
 */
export type Rejugement = {
  passe: number; at: number;
  gardees: { element: NomElement; tour: number }[];
  aRefaire: { element: NomElement; raisons: string[]; raisonsAvant: string[] }[];
  refuseesDeuxFois: { element: NomElement; raisons: string[] }[];
  /** Les images reçues avec la consigne d'avant et jamais relues (« case-tour ») : jamais reprises telles quelles. */
  perimees: string[];
  /** Les textes inventés vus au contrôle sur une image du premier essai (A_REFAIRE), ajoutés à son verdict comme le relecteur les aurait relevés. */
  aLOeil: Record<string, string>;
  devis: { probableMicro: number; maxMicro: number; plafondConseilleMicro: number; images: number; relectures: number; logoHd: boolean };
  texte: string[];
};
/** Un verdict reçu, complété du texte inventé vu au contrôle (dans `inventes`, comme le relecteur l'aurait relevé). */
export function avecLOeil<V extends { inventes?: { ou: string; texte: string }[] }>(v: V, texte: string | undefined): V {
  return texte?.trim() ? { ...v, inventes: [...(v.inventes ?? []), { ou: "vu au contrôle", texte: texte.trim() }] } : v;
}
/** `A_REFAIRE="case:texte inventé lu;case:texte"` : les images marquées à refaire au contrôle, avec le texte inventé vu. */
export function lireALOeil(v: string | undefined): Map<NomElement, string> {
  const m = new Map<NomElement, string>();
  for (const morceau of (v ?? "").split(";")) { const i = morceau.indexOf(":"); if (i > 0) m.set(morceau.slice(0, i).trim() as NomElement, morceau.slice(i + 1).trim()); }
  return m;
}
export async function rejugerLEssaiEnVrai(o: { sortie: string; client: ClientDeLEssai; donnees: DonneesDeLaPlanche; personnes?: boolean; logoHd?: boolean; aLOeil?: ReadonlyMap<NomElement, string> }): Promise<Rejugement> {
  const P = await import("../../src/lib/syna-agent/planche-en-vrai");
  // Ses faits à montrer (27 novembre 2026, `faits-de-l-essai.mts`) : sans eux, rien ne change.
  const faitsDuClient = await faitsPermisDuClient(o.client), avecFaits = aDesFaits(faitsDuClient) ? { faits: faitsDuClient } : {};
  const T = await import("../../src/lib/syna-agent/planche-en-vrai-tache");
  const { plafondConseilleMicro } = await import("./plafond-des-essais");
  const prec = passePrecedente(o.sortie);
  if (!prec?.inventaire) throw new Error(`REJUGER=1 : rien à rejuger dans ${o.sortie} (aucun inventaire reçu). Rien n'est fait.`);
  for (const n of o.aLOeil?.keys() ?? []) if (!(P.NOMS_DES_ELEMENTS as string[]).includes(n)) throw new Error(`A_REFAIRE : « ${n} » n'est pas une case de la planche en vrai. Rien n'est fait.`);
  // La zone de chaque case, lue sur les boîtes de la passe (apercus/cases.json), comme le réassemblage : aucune découpe à refaire.
  const boites = ((lireJson(path.join(o.sortie, "apercus", "cases.json")) as { boites?: Record<string, [number, number, number, number]> } | null)?.boites) ?? {};
  const deborde = (n: string) => !!boites[n] && P.entreDansUneBandeDeTitre(o.donnees.disposition, boites[n]);
  const logo = { nom: o.client.nom.trim(), phrase: lignesDuTexte(o.donnees.phrase) };
  const raisonsDAlors = (g: string, tour: number, n: string): string[] => ((lireJson(path.join(o.sortie, "relectures", `${g}-${tour}-verdict.json`)) as { raisons?: Record<string, string[]> } | null)?.raisons?.[n]) ?? [];
  const r: Rejugement = { passe: prec.numero, at: Date.now(), gardees: [], aRefaire: [], refuseesDeuxFois: [], perimees: [], aLOeil: Object.fromEntries(o.aLOeil ?? []), devis: { probableMicro: 0, maxMicro: 0, plafondConseilleMicro: 0, images: 0, relectures: 0, logoHd: !!o.logoHd }, texte: [] };
  const lignes: string[] = [];
  for (const n of P.NOMS_DES_ELEMENTS) {
    const g = P.def(n).groupe;
    const juge = (tour: number) => {
      const lu = prec.relectures.get(`${g}-${tour}`)?.images.find((x) => x.case === n);
      const v = lu && tour === 1 ? avecLOeil(lu, o.aLOeil?.get(n)) : lu;
      if (!prec.images.has(`${n}-${tour}`) || !v) return null;
      const raisons = P.raisonsDuRefusEnVrai(v, { inventaire: P.caseLue(prec.inventaire, n), personnes: !!o.personnes, photo: false, element: n, deborde: deborde(n), logo, produits: o.client.produits, ...avecFaits });
      return raisons;
    };
    const t1 = juge(1), t2 = juge(2);
    if (t1 && !t1.length) { r.gardees.push({ element: n, tour: 1 }); lignes.push(`  ${n} : GARDÉE (essai 1)${raisonsDAlors(g, 1, n).length ? ` ; refusée avant le rejugement pour : ${raisonsDAlors(g, 1, n).join(" ; ")}` : ""}`); continue; }
    if (t2 && !t2.length) { r.gardees.push({ element: n, tour: 2 }); lignes.push(`  ${n} : GARDÉE (essai 2)`); continue; }
    if (t2) { r.refuseesDeuxFois.push({ element: n, raisons: t2 }); lignes.push(`  ${n} : refusée deux fois, l'aperçu garde sa case : ${t2.join(" ; ")}`); continue; }
    const raisons = t1 ?? [prec.images.has(`${n}-1`) ? "pas encore relue" : "pas encore reçue"];
    r.aRefaire.push({ element: n, raisons, raisonsAvant: raisonsDAlors(g, 1, n) });
    if (prec.images.has(`${n}-2`)) r.perimees.push(`${n}-2`);
    lignes.push(`  ${n} : À REFAIRE : ${raisons.join(" ; ")}${prec.images.has(`${n}-2`) ? " (sa reprise reçue avec la consigne d'avant, jamais relue, est périmée)" : ""}${prec.sansReponse.includes(`${n}-2`) ? " (sa reprise est partie sans réponse : résultat incertain)" : ""}`);
  }
  const reprises = T.devisDesReprisesEnVrai(r.aRefaire.map((x) => x.element));
  const logos = o.logoHd ? T.devisDesLogosEnHd() : null;
  const probable = reprises.probableMicro + (logos?.probableMicro ?? 0), max = reprises.maxMicro + (logos?.maxMicro ?? 0);
  r.devis = { probableMicro: probable, maxMicro: max, plafondConseilleMicro: plafondConseilleMicro(probable), images: reprises.images, relectures: reprises.relectures, logoHd: !!o.logoHd };
  r.texte = [
    `Rejugement gratuit de la passe ${prec.numero} (REJUGER=1, aucun appel) : ${r.gardees.length} image(s) gardée(s) sur ${P.NOMS_DES_ELEMENTS.length}, ${r.aRefaire.length} à refaire, ${r.refuseesDeuxFois.length} refusée(s) deux fois.`,
    ...lignes,
    `Ce que le code a pu rejuger : les textes lus, la note et les cases cochées par le relecteur. Ce qu'il ne peut pas : un texte que le relecteur n'a pas recopié ; les images gardées ont été regardées au contrôle${o.aLOeil?.size ? `, et ${[...o.aLOeil.keys()].join(", ")} marquée(s) à refaire` : ", aucune n'a été marquée à refaire"}.`,
    ...(r.perimees.length ? [`Images reçues avec la consigne d'avant et jamais relues, périmées (rangées à part et refaites à la reprise) : ${r.perimees.join(", ")}.`] : []),
    `Reste à faire (REPRENDRE=1, devis du Studio) : ${reprises.images} image(s) refaite(s) une fois à la charge du Studio, ${reprises.relectures} relecture(s) (${reprises.groupes.join(", ") || "aucune"})${logos ? `, puis LOGO_HD (${logos.images} images et ${logos.relectures} relecture, une reprise des refusées)` : ""}, puis les logos, la palette, les polices et l'assemblage par le code (gratuits).`,
    `Probable : ${euros(probable)} ; somme des maxima : ${euros(max)} ; plafond conseillé : ${euros(r.devis.plafondConseilleMicro)} (deux fois le probable, arrondi).`,
  ];
  fs.writeFileSync(path.join(o.sortie, "rejugement.json"), `${JSON.stringify(r, null, 2)}\n`);
  fs.writeFileSync(path.join(o.sortie, "rejugement.txt"), `${r.texte.join("\n")}\n`);
  return r;
}

type Qui = { userId: string; projectId: string; jobId: string };

const png = (f: string, quoi: string) => {
  if (!fs.existsSync(f)) throw new Error(`${quoi} introuvable : ${f}. Rien n'est lancé.`);
  const b = fs.readFileSync(f);
  if (b[0] !== 137 || b[1] !== 80) throw new Error(`${quoi} ${f} n'est pas un PNG : rien n'est lancé.`);
  return b;
};

/**
 * L'essai lui-même. `ai` : les appels (par défaut `plancheEnVraiDeps.ai`, sinon les vrais appels du Studio,
 * `vraisAppelsEnVrai`, sous le plafond du client et la borne du Studio du devis, comme dans la tâche). Le plafond, en euros,
 * allume le garde-fou de l'essai pour toute la durée du script.
 */
export async function essaiDeLaPlancheEnVrai(o: {
  sortie: string; plafondEuros: string; planche: string; logo: string; client: ClientDeLEssai; donnees: DonneesDeLaPlanche; ai?: (q: Qui) => PlancheEnVraiAi;
  /** LOGO_HD=1 : les quatre petites versions du logo en haute définition, à la charge du Studio, après la planche en vrai. */
  logoHd?: boolean; aiLogos?: (q: Qui) => LogosEnHdAi;
  /** Le métier court de la recherche du logo (esquisses.json, « metier.court ») : le bas du badge sans phrase, comme dans le Studio. */
  metierCourt?: string | null;
  /**
   * REPRENDRE=1 : la reprise d'une première passe interrompue, même dossier de sortie (`passePrecedente`). L'inventaire, les
   * images et les relectures déjà reçus sont repris tels quels, sans appel ; le reste est fait normalement.
   */
  reprendre?: boolean;
}): Promise<ResultatEnVrai> {
  const plafond = Number(o.plafondEuros.replace(",", "."));
  if (!Number.isFinite(plafond) || plafond <= 0) throw new Error("PLAFOND_ESSAI_EUR manquant ou illisible : rien n'est lancé.");
  const demo = png(o.planche, "Planche choisie"), logoFini = png(o.logo, "Logo fini");
  const client = o.client, donnees = o.donnees;
  // La reprise : la passe d'avant relue, la même planche et le même logo exigés, puis son rapport et sa dépense archivés.
  const prec = o.reprendre ? passePrecedente(o.sortie) : null;
  if (o.reprendre && !prec) throw new Error(`REPRENDRE=1 : rien à reprendre dans ${o.sortie} (ni inventaire, ni image reçue, ni rapport). Rien n'est lancé.`);
  if (prec) {
    const shaDe = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex");
    if (prec.plancheSha && prec.plancheSha !== shaDe(demo)) throw new Error(`REPRENDRE=1 : la planche donnée n'est pas celle de la passe d'avant (sha256 ${prec.plancheSha}). Rien n'est lancé.`);
    if (prec.logoSha && prec.logoSha !== shaDe(logoFini)) throw new Error(`REPRENDRE=1 : le logo donné n'est pas celui de la passe d'avant (sha256 ${prec.logoSha}). Rien n'est lancé.`);
    const archive = path.join(o.sortie, `passe-${prec.numero}`);
    fs.mkdirSync(path.join(archive, "cases"), { recursive: true });
    for (const nom of ["rapport.txt", "depense.json", "usage.json", "etat.json", "essai.json"]) if (fs.existsSync(path.join(o.sortie, nom))) fs.copyFileSync(path.join(o.sortie, nom), path.join(archive, nom));
    // Les appels partis sans réponse : leur texte et leurs images jointes, tels qu'ils étaient partis (ils seront réécrits).
    for (const nom of fs.readdirSync(path.join(o.sortie, "cases"))) if (prec.sansReponse.some((b) => nom.startsWith(`${b}-`))) fs.copyFileSync(path.join(o.sortie, "cases", nom), path.join(archive, "cases", nom));
  }
  // Le garde-fou de l'essai, compté depuis le début du script.
  process.env.STUDIO_ESSAI_PLAFOND_EUROS = String(plafond);
  const debut = Date.now();
  process.env.STUDIO_ESSAI_DEBUT = String(debut);
  fs.mkdirSync(o.sortie, { recursive: true });
  for (const d of ["apercus", "cases", "relectures", "logos"]) fs.mkdirSync(path.join(o.sortie, d), { recursive: true });

  const sharp = (await import("sharp")).default;
  const { id, run, all } = await import("../../src/lib/db");
  const { account, project } = await import("../../tests/conversation209-fixtures");
  const T = await import("../../src/lib/syna-agent/planche-en-vrai-tache");
  const P = await import("../../src/lib/syna-agent/planche-en-vrai");
  const C = await import("../../src/lib/syna-agent/planche-en-vrai-code");
  const { copyright, mentionDuDomaine } = await import("../../src/lib/syna-agent/planche-de-marque");
  const { logoDetoure, photosDuProduitIds } = await import("../../src/lib/syna-agent/brand-images");
  const { couleursDuLogo } = await import("../../src/lib/syna-agent/couleurs-du-logo");
  const { assetData, getAsset, saveAsset } = await import("../../src/lib/library");
  const { peopleAllowed } = await import("../../src/lib/people-policy");
  const { setJsonSetting } = await import("../../src/lib/settings");
  const { CostCapReached, depensesDeLaTache, withTrace } = await import("../../src/lib/ai/trace");
  const { PlafondDeLEssaiAtteint, depensesDeLEssai, arretParLEssai } = await import("../../src/lib/ai/plafond-essai");
  const { runForUser } = await import("../../src/lib/ai/access");
  const { runWithLang } = await import("../../src/lib/i18n-server");

  const devis = await devisDeLEssaiEnVrai();
  // Le réglage de la planche en vrai, allumé dans la base de l'essai seulement (DATA_DIR du studio privé d'essai).
  setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, true);

  // 1. Le client inventé, son projet (sans aucune photo de produit), la planche choisie et le logo fini.
  const u = await account();
  const projectId = project(u, typeDuProjet(client)) as string;
  run("UPDATE projects SET name=? WHERE id=?", client.nom, projectId);
  // Ses faits rangés dans la fiche du projet, comme dans le Studio : ce qui les relit dans le projet les voit aussi.
  await rangerLesFaitsDansLeProjet(u.id, projectId, client);
  const jobId = `essai-planche-en-vrai-${id()}`;
  const qui: Qui = { userId: u.id, projectId, jobId };
  const personnes = peopleAllowed(projectId);
  const fiche = await ficheDuClient(client, projectId);
  // Ses faits à montrer (27 novembre 2026, `faits-de-l-essai.mts`) : sans eux, rien ne change.
  const faitsDuClient = await faitsPermisDuClient(client), avecFaits = aDesFaits(faitsDuClient) ? { faits: faitsDuClient } : {};
  const demoAsset = await saveAsset({ userId: u.id, projectId, data: demo, name: "planche-choisie.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { plancheDeMarque: { key: "A", tour: 1, nom: client.nom, disposition: donnees.disposition } } });
  const logoAsset = await saveAsset({ userId: u.id, projectId, data: logoFini, name: "logo-fini.png", mime: "image/png", role: "logo", origin: "generated", status: "ready" });
  // Les couleurs de la marque, tirées du logo par le Studio (comme à l'adoption du logo) : elles donnent l'encre de la planche.
  const det = await logoDetoure(logoFini);
  const couleurs = det.ok ? (await couleursDuLogo(det.png).catch(() => null))?.palette ?? null : null;
  const palette = { dark: "#1C2A24", primary: "#1C2A24", secondary: "#E8E4DC", accent: "#1C2A24", light: "#F9F8F4", ...(couleurs ?? {}) };
  const route = { key: "A", name: client.nom, slogan: donnees.phrase, palette, board: { planche: { image: { id: demoAsset.id, w: 1536, h: 2304 }, logo: logoAsset.id, domaine: donnees.domaine, statut: donnees.statut, annee: donnees.annee, essais: 1, at: debut, ...(donnees.finitions?.length ? { finitions: donnees.finitions } : {}) } } };

  const brut: PlancheEnVraiAi = o.ai ? o.ai(qui) : T.plancheEnVraiDeps.ai ? T.plancheEnVraiDeps.ai(jobId) : T.vraisAppelsEnVrai(qui);
  const res: ResultatEnVrai = { client, donnees, apercus: [], refusALaDecoupe: [], cases: [], relectures: [], logos: [], depenseMicro: 0, appels: [], devis, ...(prec ? { reprise: { passe: prec.numero, reprises: [], refaits: [], ecarts: [], depensePrecedenteMicro: prec.depenseMicro, depenseDesPassesArchiveesMicro: prec.depenseDesPassesArchiveesMicro, incertainMicro: prec.incertainMicro, sansReponse: prec.sansReponse } } : {}) };
  const repris = (quoi: string) => res.reprise?.reprises.push(quoi);
  const ecrireFichier = (nom: string, contenu: string | Buffer) => { fs.writeFileSync(path.join(o.sortie, nom), contenu); return nom; };
  const json = (v: unknown) => `${JSON.stringify(v, (_k, x) => (Buffer.isBuffer(x) ? `[image de ${x.length} octets]` : x && typeof x === "object" && x.type === "Buffer" && Array.isArray(x.data) ? `[image de ${x.data.length} octets]` : x), 2)}\n`;
  const sha = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex");
  const caseDe = (n: NomElement) => { let c = res.cases.find((x) => x.element === n); if (!c) { c = { element: n, essais: [] }; res.cases.push(c); } return c; };
  const essaiDe = (n: NomElement, tour: number) => { const c = caseDe(n); let e = c.essais.find((x) => x.tour === tour); if (!e) { e = { tour }; c.essais.push(e); } return e; };

  // Les aperçus découpés par le Studio (gratuit), écrits tels qu'ils partent.
  const decoupe = await P.decouperLesApercus(demo, donnees.disposition);
  for (const [n, b] of decoupe.apercus) res.apercus.push(ecrireFichier(`apercus/${n}.png`, b));
  res.refusALaDecoupe = decoupe.refus;
  ecrireFichier("apercus/cases.json", json({ disposition: donnees.disposition, boites: Object.fromEntries(decoupe.boites), refus: decoupe.refus }));

  // Toute erreur d'un appel (panne, plafond) est gardée : l'essai s'arrête là (jamais de relance).
  let erreur: unknown = null;
  const garder = async <X>(fn: () => Promise<X>): Promise<X> => { try { return await fn(); } catch (e) { erreur ??= e; throw e; } };
  // 2. Les appels du Studio, tels quels, avec ce qui part et ce qui revient écrit tout de suite (un arrêt ne perd rien).
  const ai: PlancheEnVraiAi = {
    inventaire: async (images, demande) => {
      const ecrit = `${P.INVENTAIRE_SYSTEM}\n\n--- demande ---\n${demande}\n\n--- images jointes, dans l'ordre (${images.length}) ---\n${images.map((im, i) => `${i + 1}. ${im.label} (${im.data.length} octets, sha256 ${sha(im.data)})`).join("\n")}\n`;
      // Reprise : l'inventaire reçu à la passe d'avant est repris tel quel, jamais redemandé ; sa demande doit être la même.
      if (prec?.inventaire) {
        if (prec.demandeDeLInventaire != null && prec.demandeDeLInventaire !== demandeSansEmpreintes(ecrit)) throw (erreur ??= new RepriseRefusee("la demande de l'inventaire n'est plus celle de la passe d'avant (le code a changé) : l'inventaire reçu ne correspondrait plus ; rien n'est lancé"));
        if (prec.demandeDeLInventaire != null && fs.readFileSync(path.join(o.sortie, "inventaire-demande.txt"), "utf8") !== ecrit) res.reprise!.ecarts.push("inventaire : mêmes demande et images jointes, empreintes des octets différentes (même contenu attendu)");
        res.inventaire = prec.inventaire; repris("l'inventaire");
        return prec.inventaire;
      }
      ecrireFichier("inventaire-demande.txt", ecrit);
      ecrireFichier("inventaire-logo-joint.png", images.at(-1)!.data);
      const v = await garder(() => brut.inventaire(images, demande));
      res.inventaire = v;
      ecrireFichier("inventaire-reponse.json", json(v));
      return v;
    },
    refaire: async (d, cle) => {
      const tour = cle.endsWith("-r1") ? 2 : 1, e = essaiDe(d.element, tour), base = `cases/${d.element}-${tour}`;
      // Reprise : l'image reçue à la passe d'avant est reprise telle quelle, jamais redemandée ; son texte doit être le même.
      let recue = prec?.images.get(`${d.element}-${tour}`);
      // REJUGER=1 a déclaré cette image périmée (reçue avec la consigne d'avant les corrections, jamais gardée) : elle est
      // rangée dans passe-N/cases-perimees/ et refaite avec la consigne d'aujourd'hui, parce que le propriétaire relance.
      if (recue && prec?.rejugement?.perimees.includes(`${d.element}-${tour}`)) {
        const dossier = path.join(o.sortie, `passe-${prec.numero}`, "cases-perimees");
        fs.mkdirSync(dossier, { recursive: true });
        for (const nom of fs.readdirSync(path.join(o.sortie, "cases"))) if (nom.startsWith(`${d.element}-${tour}-`)) fs.renameSync(path.join(o.sortie, "cases", nom), path.join(dossier, nom));
        res.reprise!.ecarts.push(`${d.element} (essai ${tour}) : image reçue avec la consigne d'avant, déclarée périmée par REJUGER=1, rangée dans passe-${prec.numero}/cases-perimees/ et refaite`);
        recue = undefined;
      }
      if (recue) {
        // Une image reçue AVANT la ligne des étiquettes (même texte, cette ligne en moins) est reprise telle quelle : elle a
        // été payée, et son verdict est recompté par le code d'aujourd'hui.
        // Une image reçue avant les mentions vraies (27 novembre 2026) : la ligne des étiquettes d'avant à la place de la sienne.
        const sansMentions = P.texteSansLesMentionsVraies(d.texte, client.produits, faitsDuClient);
        // Une image reçue avant les noms exacts donnés par le client (27 novembre 2026) : la ligne d'alors, aux produits de la fiche.
        const sansNoms = P.texteSansLesNomsDonnes(d.texte, client.produits, faitsDuClient);
        const avantLaLigne = recue.texte != null && recue.texte !== d.texte && [P.texteSansLaLigneDesTextes(d.texte, client.produits, faitsDuClient), P.texteSansLaLigneDesPetitsTextes(d.texte), sansMentions, P.texteSansLaLigneDesPetitsTextes(sansMentions), sansNoms, P.texteSansLaLigneDesPetitsTextes(sansNoms)].includes(recue.texte);
        if (avantLaLigne) res.reprise!.ecarts.push(`${d.element} (essai ${tour}) : image reçue avant la ligne des étiquettes, reprise telle quelle et rejugée par le code`);
        else if (recue.texte != null && recue.texte !== d.texte) throw (erreur ??= new RepriseRefusee(`le texte de ${d.element} (essai ${tour}) n'est plus celui de la passe d'avant : l'image reçue ne correspondrait plus ; rien de plus n'est lancé (REJUGER=1 dit lesquelles refaire)`));
        const differentes = d.jointes.filter((j) => recue.jointes.get(j.role) && recue.jointes.get(j.role) !== sha(j.data)).map((j) => j.role);
        if (differentes.length) res.reprise!.ecarts.push(`${d.element} (essai ${tour}) : image(s) jointe(s) ${differentes.join(", ")} aux octets différents de la passe d'avant`);
        e.texte = `${base}-texte-envoye.txt`;
        e.jointes = d.jointes.map((j, i) => ({ role: j.role, fichier: `${base}-jointe-${i + 1}-${j.role}.png` }));
        e.brute = recue.fichier;
        if (fs.existsSync(path.join(o.sortie, `${base}-recu.json`))) e.recu = `${base}-recu.json`;
        repris(`${d.element}${tour > 1 ? " (reprise)" : ""}`);
        return { png: recue.png, recu: recue.recu };
      }
      if (prec?.sansReponse.includes(`${d.element}-${tour}`)) res.reprise!.refaits.push(d.element);
      e.texte = ecrireFichier(`${base}-texte-envoye.txt`, d.texte);
      e.jointes = d.jointes.map((j, i) => ({ role: j.role, fichier: ecrireFichier(`${base}-jointe-${i + 1}-${j.role}.png`, j.data) }));
      const r = await garder(() => brut.refaire(d, cle));
      e.brute = ecrireFichier(`${base}-hd.png`, r.png);
      if (r.recu) e.recu = ecrireFichier(`${base}-recu.json`, json(r.recu));
      return r;
    },
    relire: async (images, demande, cle) => {
      const tour = cle.endsWith("-r1") ? 2 : 1, groupe = cle.replace(/^relecture-/, "").replace(/-r1$/, ""), base = `relectures/${groupe}-${tour}`;
      // Reprise : la relecture reçue à la passe d'avant est reprise telle quelle (ses raisons sont recomptées par le code).
      const recueTelle = prec?.relectures.get(`${groupe}-${tour}`);
      // Les textes inventés vus au contrôle (REJUGER=1 avec A_REFAIRE) s'ajoutent au verdict du premier essai, comme au rejugement.
      const oeil = tour === 1 ? prec?.rejugement?.aLOeil ?? {} : {};
      const relue = recueTelle && { ...recueTelle, images: recueTelle.images.map((x) => avecLOeil(x, oeil[x.case])) };
      if (relue) { repris(`relecture ${groupe}${tour > 1 ? " (reprise)" : ""}`); return comptee(images, relue, cle, groupe, tour, base, false); }
      ecrireFichier(`${base}-demande.txt`, `${P.RELECTEUR_EN_VRAI}\n\n--- demande ---\n${demande}\n\n--- images jointes, dans l'ordre (${images.length}) ---\n${images.map((im, i) => `${i + 1}. ${im.label} (${im.data.length} octets, sha256 ${sha(im.data)})`).join("\n")}\n`);
      const v = await garder(() => brut.relire(images, demande, cle));
      return comptee(images, v, cle, groupe, tour, base, true);
    },
  };
  // Les raisons du refus, comptées par le code du Studio comme dans la tâche (raisonsDuRefusEnVrai).
  // `ecrire` faux : une relecture reprise de la passe d'avant, dont le fichier reçu est gardé tel quel.
  function comptee(images: { data: Buffer; label: string }[], v: RelectureDuGroupe, cle: string, groupe: string, tour: number, base: string, ecrire: boolean): RelectureDuGroupe {
    const relues = images.filter((im) => im.label.endsWith(" refaite")).map((im) => im.label.replace(/ refaite$/, "") as NomElement);
    const raisons: Record<string, string[]> = {};
    for (const n of relues) {
      const photo = images.some((im) => im.label === `${n} produit`);
      raisons[n] = P.raisonsDuRefusEnVrai(v.images.find((x) => x.case === n), { inventaire: P.caseLue(res.inventaire, n), personnes, photo, element: n, deborde: decoupe.debordes?.includes(n), logo: { nom: client.nom, phrase: lignesDuTexte(donnees.phrase) }, produits: client.produits, ...avecFaits });
      const e = essaiDe(n, tour);
      e.raisons = raisons[n]; e.verdict = v.images.find((x) => x.case === n) ?? null;
    }
    const fichier = ecrire ? ecrireFichier(`${base}-verdict.json`, json({ verdict: v, raisons, gardees: Object.entries(raisons).filter(([, r]) => !r.length).map(([n]) => n) })) : `${base}-verdict.json`;
    res.relectures.push({ cle, groupe, tour, verdict: v, fichier });
    return v;
  }
  // Les points de reprise de la tâche, en mémoire (une seule exécution).
  const reprises = new Map<string, unknown>();
  const journal: string[] = [];
  const ctx = {
    step: async <X>(k: string, fn: () => Promise<X>): Promise<X> => { if (reprises.has(k)) return reprises.get(k) as X; const v = await fn(); reprises.set(k, v); return v; },
    progress: (_p: number, label: string) => { journal.push(label); },
  };

  const lignes: string[] = [
    `Essai de la planche en vrai — client « ${client.nom} » (${client.metier}), type « ${client.kind} »`,
    `Produits ou prestations de sa fiche : ${client.produits.join(" ; ")}`,
    `Photos de produit du client : ${photosDuProduitIds(projectId, 3).length} (les produits de la planche restent des images d'ambiance sans elles)`,
    `Plafond de l'essai : ${euros(Math.floor(plafond * 1_000_000))}`,
    `Personnes permises : ${personnes ? "oui" : "non (aucune photo de personne ni accord)"}`,
    `Planche choisie : ${o.planche} (sha256 ${sha(demo)}) ; disposition ${donnees.disposition}`,
    `Logo fini : ${o.logo} (sha256 ${sha(logoFini)})`,
    `Données de la planche : ${copyright(donnees.annee, client.nom)} ; ${mentionDuDomaine({ domaine: donnees.domaine, statut: donnees.statut })} ; phrase sous le nom : ${donnees.phrase ? lignesDuTexte(donnees.phrase).map((l) => `« ${l} »`).join(" puis ") : "aucune"}`,
    `Couleurs tirées du logo par le Studio : ${couleurs ? Object.entries(couleurs).map(([k, v]) => `${k} ${v}`).join(", ") : `non tirées (${det.ok ? "aucune couleur lue" : det.why}) : encre par défaut`}`,
    `Réglage ${P.REGLAGE_PLANCHE_EN_VRAI} : allumé dans la base de l'essai seulement`,
    "", ...devisEnTexteEnVrai(devis), "",
    `Découpe : ${decoupe.apercus.size} aperçus (apercus/)${decoupe.refus.length ? ` ; refusées : ${decoupe.refus.map((r) => `${r.case} (${r.raison})`).join(", ")}` : " ; aucune case refusée"}`,
  ];
  const lireLaDepense = () => {
    const reservations = all<Record<string, any>>("SELECT * FROM ai_reservations WHERE job_id=? ORDER BY created_at, rowid", jobId);
    const appels = all<Record<string, any>>("SELECT * FROM ai_calls WHERE job_id=? ORDER BY created_at, rowid", jobId);
    const appelDe = (r: Record<string, any>) => appels.find((c) => r.usage_event_id && c.usage_event_id === r.usage_event_id);
    const detail = (c: Record<string, any> | undefined) => {
      if (!c) return undefined;
      let details: unknown = c.details;
      try { details = c.details ? JSON.parse(c.details) : null; } catch { /* tel quel */ }
      return { etape: c.step, fournisseur: c.provider, modeleDemande: c.requested_model, modeleServi: c.served_model, unite: c.unit, jetonsEntree: c.input_tokens, jetonsCacheLus: c.cache_read_tokens, jetonsCacheEcrits: c.cache_write_tokens, jetonsSortie: c.output_tokens, quantite: c.quantity, effort: c.effort, fin: c.stop_reason, dureeMs: c.latency_ms, coutMicro: c.cost, estime: !!c.estimated, statut: c.status, cle: c.usage_key, heure: c.created_at ?? null, ...(c.error_kind ? { erreur: c.error_kind } : {}), details };
    };
    res.appels = reservations.map((r) => ({ cle: r.operation_key ?? appelDe(r)?.usage_key ?? null, task: r.task ?? null, modele: r.model ? `${r.provider ?? ""}:${r.model}` : null, studio: !!r.studio, reserveMicro: r.amount, reelMicro: r.actual ?? null, statut: r.status, heure: r.created_at ?? null, ...(r.note ? { raison: r.note } : {}), ...(appelDe(r) ? { appel: detail(appelDe(r)) } : {}) }));
    ecrireFichier("depense.json", json(res.appels));
    ecrireFichier("usage.json", json(appels.map(detail)));
  };
  const ecrire = () => {
    res.depenseMicro = Math.max(depensesDeLEssai(debut), depensesDeLaTache(jobId).total);
    lireLaDepense();
    const inv = res.inventaire;
    if (inv) {
      lignes.push("", "Inventaire (inventaire-demande.txt, inventaire-reponse.json) :",
        `  polices lues : titres « ${inv.polices.titres.nom} » (${inv.polices.titres.genre}), textes « ${inv.polices.textes.nom} » (${inv.polices.textes.genre})`,
        `  couleurs lues : ${inv.couleurs.map((c) => `${c.nom || "?"}${c.mots.length ? ` (${c.mots.join(", ")})` : ""}`).join(" ; ") || "aucune"}`,
        `  icône : ${inv.icone || "—"} ; favicon : ${inv.favicon || "—"} ; reprennent le logo : ${inv.iconeReprendLeLogo ? "oui" : "non"}`,
        ...inv.cases.filter((c) => (P.NOMS_DES_ELEMENTS as string[]).includes(c.case)).map((c) => `  ${c.case} : logo ${c.logo ? "oui" : "non"}, produit ${c.produit ? "oui" : "non"}, personne ${c.personne ? "oui" : "non"}${c.comprehensible == null ? "" : `, compréhensible ${c.comprehensible ? "oui" : "non"}`} ; textes : ${c.textes.length ? c.textes.map((t) => `« ${t} »`).join(" ") : "aucun"}`));
    }
    if (res.cases.length) lignes.push("", "Les images, case par case (cases/ : texte envoyé, images jointes, image HD reçue, refusées comprises) :");
    for (const c of res.cases) {
      lignes.push(`  ${c.element} : ${c.gardee === true ? `GARDÉE (${c.fichierHd})` : c.gardee === false ? `NON gardée, l'aperçu garde sa case (${c.raison ?? "refusée"})` : "non terminée"}${c.ambiance ? " — image d'ambiance, ce n'est pas son produit" : ""}`);
      for (const e of c.essais) {
        lignes.push(`    essai ${e.tour}${e.tour === 2 ? " (reprise à la charge du Studio)" : ""} : jointes ${e.jointes?.map((j) => j.role).join(", ") ?? "—"} ; image HD ${e.brute ?? "—"}`);
        const v = e.verdict as { note?: number; pourquoi?: string } | null | undefined;
        if (e.raisons) lignes.push(`      relecture : note ${v?.note ?? "—"}/10${v?.pourquoi ? ` — ${v.pourquoi}` : ""}`, `      raisons du refus : ${e.raisons.length ? e.raisons.join(" ; ") : "aucune"}`);
      }
    }
    if (res.relectures.length) lignes.push("", `Relectures : ${res.relectures.map((r) => `${r.groupe} (essai ${r.tour}, ${r.fichier})`).join(" ; ")}`);
    const ev = res.etat;
    if (ev) {
      lignes.push("", `Logos (logos/) : ${res.logos.join(", ")}${ev.symboleComplet ? " — symbole complet (séparation non fiable ou icône qui ne reprend pas le logo)" : ""}`);
      lignes.push(`Palette mesurée (palette.json) : ${ev.palette.map((p) => `${p.hex}${p.nom ? ` ${p.nom}` : ""}`).join(" ; ")}`);
      if (ev.polices) for (const [k, p] of Object.entries(ev.polices)) lignes.push(`Police des ${k} (polices.json) : lue « ${p.lue} », prise « ${p.famille} » (${p.fichier}, ${p.poids})${p.remplacee ? " — REMPLACÉE par la plus proche du catalogue" : ""}`);
      lignes.push(`Publications pour le calendrier : ${ev.publications.map((p) => `${p.element} (${p.comprehensible ? "compréhensible" : "incompréhensible, reste sur la planche"})`).join(" ; ") || "aucune"}`);
      for (const n of ev.notes) lignes.push(`  note : ${n}`);
      for (const n of ev.issues) lignes.push(`  SINA dirait : ${n}`);
    }
    if (res.planche) lignes.push("", `Planche assemblée : ${res.planche.fichier} (${res.planche.w} × ${res.planche.h})`);
    if (journal.length) lignes.push("", `Étapes : ${journal.join(" → ")}`);
    lignes.push("", "Dépense réelle comptée par le Studio, appel par appel (réservé au plus → réglé) :",
      ...(res.appels.length ? res.appels.map((a) => `- ${a.cle ?? a.task ?? "?"} · ${a.modele ?? "?"} · ${a.studio ? "charge du Studio" : "charge du client"} · réservé ${euros(a.reserveMicro)} → réglé ${a.reelMicro == null ? "—" : euros(a.reelMicro)} (${a.statut})${a.appel ? ` · jetons ${a.appel.jetonsEntree} en entrée, ${a.appel.jetonsSortie} en sortie` : ""}`) : ["- aucun appel"]),
      "", `Dépense réelle comptée par le Studio : ${euros(res.depenseMicro)}`, "Détail complet : depense.json (appel par appel), usage.json (jetons, qualité, taille, fond, format renvoyés).");
    if (res.reprise) {
      const r = res.reprise;
      lignes.push("", `REPRISE de la passe ${r.passe} (REPRENDRE=1 ; son rapport et sa dépense sont dans passe-${r.passe}/) :`,
        `  repris tels quels, sans appel : ${r.reprises.join(", ") || "rien"}`,
        ...(r.sansReponse.length ? [`  appel(s) parti(s) sans réponse à la passe ${r.passe} (résultat incertain, coût maximal retenu : ${euros(r.incertainMicro)}) : ${r.sansReponse.join(", ")} ; refait(s) cette fois : ${r.refaits.join(", ") || "aucun"}, seulement parce que le propriétaire a relancé lui-même avec REPRENDRE=1 (jamais tout seul)`] : []),
        ...r.ecarts.map((x) => `  écart noté : ${x}`),
        `  dépense comptée à la passe ${r.passe} : ${euros(r.depensePrecedenteMicro)} ; à cette passe : ${euros(res.depenseMicro)}${r.depenseDesPassesArchiveesMicro ? ` ; aux passes d'avant (${Array.from({ length: r.passe - 1 }, (_, i) => `passe-${i + 1}/`).join(", ")}) : ${euros(r.depenseDesPassesArchiveesMicro)}` : ""} ; en tout : ${euros(r.depenseDesPassesArchiveesMicro + r.depensePrecedenteMicro + res.depenseMicro)}`);
    }
    if (res.arret) lignes.push("", `ARRÊT : ${res.arret}`);
    // Arrêté par le plafond de l'essai (26 novembre 2026) : ce qui est fait et ce qu'il faudrait au plus pour finir.
    if (res.arret?.startsWith("le garde-fou de l'essai a refusé")) {
      const faites = res.cases.filter((c) => c.essais.some((e) => e.brute));
      lignes.push("", ...lignesDeLArret({ depenseMicro: res.depenseMicro, plafondMicro: Math.floor(plafond * 1_000_000), plafondMinimalMicro: devis.plafondMinimalMicro + (devisLogos?.maxMicro ?? 0),
        fait: [...(res.inventaire ? ["inventaire de la planche (jamais refait)"] : []), ...faites.map((c) => `case ${c.element} : image reçue${c.gardee ? ` et gardée (${c.fichierHd})` : ""}`)],
        reprendre: "voir « Comment reprendre » ci-dessous." }));
    }
    // Tout arrêt (plafond, panne, résultat incertain) dit comment reprendre sans redemander ce qui est reçu.
    if (res.arret) lignes.push("", ...lignesPourReprendre(res, P.NOMS_DES_ELEMENTS, { incertain: !res.arret.startsWith("le garde-fou") && !res.arret.startsWith("le plafond de la tâche") && !res.arret.startsWith("reprise refusée") }));
    ecrireFichier("rapport.txt", `${lignes.join("\n")}\n`);
    return res;
  };
  const raisonDeLArret = (e: unknown) => e instanceof RepriseRefusee ? `reprise refusée avant tout appel : ${e.message}` : e instanceof PlafondDeLEssaiAtteint ? `le garde-fou de l'essai a refusé un appel : ${e.message}`
    : e instanceof CostCapReached ? `le plafond de la tâche (celui du Studio) a refusé un appel : ${e.message}`
      : `un appel a échoué, jamais relancé : ${messageAvecCause(e).slice(0, 700)}`;

  ecrireFichier("fiche-du-client.txt", `${fiche}\n`);
  // LOGO_HD : la borne du Studio couvre aussi les quatre petites versions en haute définition (reprise comprise).
  const devisLogos = o.logoHd ? T.devisDesLogosEnHd() : null;
  // Comme dans le Studio (brand-finish.ts) : la phrase choisie sous le logo est la ligne du logo ; sans elle, le métier court.
  const ligneDuLogo = donnees.phrase || null, metierCourt = o.metierCourt?.trim() || null;
  return runWithLang({ ui: "fr", content: "fr" }, () => runForUser(u.id, () => withTrace({ jobId, projectId, costCapMicro: devis.devisDuStudio.maxMicro, studioCapMicro: devis.devisDuStudio.studioMaxMicro + (devisLogos?.maxMicro ?? 0) }, async () => {
    let etat: EtatPlancheEnVrai;
    try {
      etat = await T.plancheEnVrai({ ctx, ai, who: { userId: u.id, projectId }, route: route as never, logoAssetId: logoAsset.id, personnes, phrase: donnees.phrase, ligneDuLogo, metierCourt, produits: client.produits, faits: faitsDuClient });
    } catch (e) { res.arret = raisonDeLArret(erreur ?? e); return ecrire(); }
    // LOGO_HD sur le chemin normal (26 novembre 2026) : après la planche en vrai, les versions reprises de l'aperçu sont
    // refaites en haute définition par la fonction du Studio (`refaireLesLogosEnHdEnVrai`), à la charge du Studio, chaque
    // appel écrit tout de suite dans logos-hd/ ; puis les logos et la planche sont refaits par le code avec les versions
    // gardées. Une panne arrête les logos en haute définition, jamais relancée : la planche en vrai reste celle d'avant.
    if (o.logoHd && devisLogos) {
      const versions = P.VERSIONS_EN_HD.filter((v) => etat.logosDeLApercu?.includes(v));
      res.logosEnHd = { versions, gardees: [], refusees: [], devis: { maxMicro: devisLogos.maxMicro, probableMicro: devisLogos.probableMicro } };
      if (!versions.length) lignes.push("", "LOGO_HD : le symbole du logo est séparable, aucune petite version n'est reprise de l'aperçu ; rien à refaire en haute définition, aucun appel.");
      else {
        fs.mkdirSync(path.join(o.sortie, "logos-hd"), { recursive: true });
        const brutL: LogosEnHdAi = o.aiLogos ? o.aiLogos(qui) : T.logosEnHdDeps.ai ? T.logosEnHdDeps.ai(jobId) : T.vraisAppelsDesLogosEnHd(qui);
        const aiL: LogosEnHdAi = {
          refaire: async (d, cle) => {
            // Reprise : le logo reçu à la passe d'avant est repris tel quel, jamais redemandé ; son texte doit être le même.
            const recu = prec?.logosHd.images.get(cle);
            if (recu) {
              const avant = fs.existsSync(path.join(o.sortie, `logos-hd/${cle}-texte-envoye.txt`)) ? fs.readFileSync(path.join(o.sortie, `logos-hd/${cle}-texte-envoye.txt`), "utf8") : null;
              if (avant != null && avant !== d.texte) throw new RepriseRefusee(`le texte de ${cle} n'est plus celui de la passe d'avant : le logo reçu ne correspondrait plus ; rien de plus n'est lancé`);
              repris(cle);
              return { png: recu, recu: lireJson(path.join(o.sortie, `logos-hd/${cle}-recu.json`)) };
            }
            ecrireFichier(`logos-hd/${cle}-texte-envoye.txt`, d.texte);
            d.jointes.forEach((j, i) => ecrireFichier(`logos-hd/${cle}-jointe-${i + 1}-${j.role}.png`, j.data));
            const r = await brutL.refaire(d, cle);
            ecrireFichier(`logos-hd/${cle}-recue.png`, r.png);
            if (r.recu) ecrireFichier(`logos-hd/${cle}-recu.json`, json(r.recu));
            return r;
          },
          relire: async (images, demande, cle) => {
            const relue = prec?.logosHd.relectures.get(cle);
            if (relue) { repris(cle); return relue as Awaited<ReturnType<LogosEnHdAi["relire"]>>; }
            ecrireFichier(`logos-hd/${cle}-demande.txt`, demande);
            const v = await brutL.relire(images, demande, cle);
            ecrireFichier(`logos-hd/${cle}-verdict.json`, json(v));
            return v;
          },
        };
        const { aLaChargeDuStudio } = await import("../../src/lib/billing");
        try {
          const avant = etat;
          etat = await aLaChargeDuStudio(() => T.refaireLesLogosEnHdEnVrai({ ctx, ai: aiL, who: { userId: u.id, projectId }, route: route as never, etat: avant, personnes, phrase: donnees.phrase, ligneDuLogo, metierCourt }));
          res.logosEnHd.gardees = (etat.logosEnHd ?? []) as VersionEnHd[];
          res.logosEnHd.refusees = (etat.logosEnHdRefuses ?? []) as VersionEnHd[];
          lignes.push("", `LOGO_HD (à la charge du Studio) : ${versions.join(", ")} ; gardées en haute définition : ${res.logosEnHd.gardees.join(", ") || "aucune"} ; refusées deux fois (l'agrandissement de l'aperçu reste, et SINA le dit) : ${res.logosEnHd.refusees.join(", ") || "aucune"} ; détail dans logos-hd/`);
        } catch (e) {
          res.arret = raisonDeLArret(e);
          lignes.push("", `LOGO_HD arrêté : ${res.arret} ; la planche en vrai reste celle d'avant, avec les agrandissements de l'aperçu.`);
        }
      }
    }
    res.etat = etat;
    // Ce qui est gardé : chaque image en haute définition, marquée image d'ambiance pour un produit sans photo du client.
    for (const e of etat.elements) {
      const c = caseDe(e.element);
      c.gardee = !!e.id; c.ambiance = !!e.ambiance;
      if (e.id) c.fichierHd = ecrireFichier(`cases/${e.element}-gardee-hd.png`, assetData(getAsset(e.id)!));
      else c.raison = e.raison;
    }
    // Les logos : les dix versions, le symbole, les favicons et l'avatar.
    for (const l of etat.logos) res.logos.push(ecrireFichier(`logos/${l.version}.png`, assetData(getAsset(l.id)!)));
    if (etat.favicons) for (const [k, f] of [["f32", "favicon-32.png"], ["f64", "favicon-64.png"], ["f512", "icone-512.png"], ["avatar", "avatar-reseaux.png"]] as const) res.logos.push(ecrireFichier(`logos/${f}`, assetData(getAsset(etat.favicons[k])!)));
    const symbole = all<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND role='logo-mark' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId)[0];
    if (symbole) res.logos.push(ecrireFichier("logos/symbole.png", assetData(getAsset(symbole.id)!)));
    // La palette et les polices, avec ce qui a été remplacé.
    const encre = route.palette.dark && C.luminance(route.palette.dark) < 0.35 ? route.palette.dark : "#1C2A24";
    ecrireFichier("palette.json", json({ couleurs: etat.palette, roles: C.rolesDeLaPalette(etat.palette.map((p) => p.hex), encre), couleursDuLogo: couleurs, encre }));
    ecrireFichier("polices.json", json({ lues: res.inventaire?.polices ?? null, choisies: etat.polices ?? null, remplacees: Object.entries(etat.polices ?? {}).filter(([, p]) => p.remplacee).map(([k, p]) => ({ quoi: k, lue: p.lue, prise: p.famille })) }));
    // La planche assemblée.
    if (etat.planche) {
      const b = assetData(getAsset(etat.planche.id)!), m = await sharp(b).metadata();
      res.planche = { fichier: ecrireFichier("planche-en-vrai.png", b), w: m.width ?? 0, h: m.height ?? 0 };
    }
    ecrireFichier("etat.json", json({ ...etat, inventaire: undefined }));
    // Le parcours du projet, comme la vraie tâche : l'onglet Marque du studio privé montre la planche en vrai.
    res.conversationId = (await enregistrerLeParcours({ userId: u.id, projectId, nom: client.nom, etat, donnees })).conversationId;
    res.projectId = projectId;
    // Ce que l'écran de la planche en vrai relit (ecran-planche-en-vrai.mts) : le client, les données de la planche, le projet.
    ecrireFichier("essai.json", json({ client, donnees, projectId, conversationId: res.conversationId }));
    const parLEssai = arretParLEssai(jobId);
    if (parLEssai) res.arret = raisonDeLArret(parLEssai);
    return ecrire();
  })));
}

// ---------------------------------------------------------------- le réassemblage d'un essai (26 novembre 2026)

/** Une case de l'essai, rejugée par le code corrigé : chaque essai avec ses raisons d'alors et celles d'aujourd'hui. */
export type RejugementDeCase = {
  element: NomElement;
  essais: { tour: number; note: number | null; raisonsAvant: string[]; raisonsApres: string[] }[];
  /** Le tour gardé (1 ou 2), ou « reprise » ; null : l'aperçu garde sa case. */
  gardee: number | "reprise" | null;
  /** L'aperçu de l'essai touchait la bande d'un titre de bloc (boîtes de l'essai). */
  deborde: boolean;
};
export type ResultatDuReassemblage = {
  cases: RejugementDeCase[]; gardees: number; planche: string; comparaison: string;
  palette: { hex: string; nom: string }[]; logosDeLApercu: string[];
  reprise?: { elements: NomElement[]; devis: { maxMicro: number; probableMicro: number }; depenseMicro: number; gardees: NomElement[] };
  /** Les quatre petites versions du logo refaites en haute définition (LOGO_HD) : gardées, refusées deux fois, posées sur la planche. */
  logosEnHd?: { versions: VersionEnHd[]; devis: { maxMicro: number; probableMicro: number }; depenseMicro: number; gardees: VersionEnHd[]; refusees: VersionEnHd[]; surLaPlanche: string[] };
  arret?: string; notes: string[];
  /** Le projet de la base d'essai où le réassemblage est enregistré, son fil, l'etat.json écrit (relu par l'écran). */
  projectId: string; conversationId: string; etat: string; projetCree: boolean;
};
/** Le devis chiffré du réassemblage (aucun appel) : la reprise des cases, l'option des logos en haute définition, le total. */
export async function chiffresDuReassemblage(elements: readonly NomElement[], o: { logoHd?: boolean } = {}) {
  const T = await import("../../src/lib/syna-agent/planche-en-vrai-tache");
  const d = elements.length ? T.devisDUneReprise(elements) : { maxMicro: 0, probableMicro: 0, images: 0, relectures: 0 }, l = o.logoHd ? T.devisDesLogosEnHd() : null;
  return { reprise: d, logos: l, maxMicro: d.maxMicro + (l?.maxMicro ?? 0), probableMicro: d.probableMicro + (l?.probableMicro ?? 0), siToutEstRefaitMicro: d.probableMicro + (l?.siToutEstRefaitMicro ?? 0) };
}
/** Le devis de la reprise de quelques cases et des logos en haute définition (aucun appel), avec le plafond minimal exact. */
export async function devisDuReassemblage(elements: readonly NomElement[], o: { logoHd?: boolean } = {}): Promise<string[]> {
  const c = await chiffresDuReassemblage(elements, o), d = c.reprise, l = c.logos;
  return [
    "Devis du réassemblage (fonctions du devis du Studio, aucun appel ; tout à la charge du Studio) :",
    "- a) réassemblage par le code : 0 € ; b) rejugement des images de l'essai : 0 €",
    `- c) reprise de ${elements.join(", ") || "aucune case"} : ${d.images} image(s), ${d.relectures} relecture(s) ; probable ${euros(d.probableMicro)}, au plus ${euros(d.maxMicro)}`,
    ...(l ? [`- d) LOGO_HD, les quatre petites versions du logo en haute définition (compact, icône, favicon, badge) : ${l.images} images et ${l.relectures} relecture, puis une reprise des refusées (au plus ${l.images} images et ${l.relectures} relecture) ; probable ${euros(l.probableMicro)} (si tout est refait une fois : ${euros(l.siToutEstRefaitMicro)}), au plus ${euros(l.maxMicro)}`] : []),
    `Plafond minimal exact pour la reprise${l ? " et les logos" : ""} (somme des maxima, reprises comprises) : ${euros(c.maxMicro)}`,
    `Probable en tout : ${euros(c.probableMicro)}${l ? ` (si tout est refait une fois : ${euros(c.siToutEstRefaitMicro)})` : ""}`,
  ];
}

/**
 * LE RÉASSEMBLAGE D'UN ESSAI DE LA PLANCHE EN VRAI, à partir de ses fichiers (dossier de l'essai : essai.json,
 * inventaire-reponse.json, apercus/cases.json, cases/, relectures/), de la planche choisie et du logo fini, uniquement par
 * les fonctions du Studio :
 *  a) gratuit, sans aucun appel : les logos, la palette, les polices, les textes et l'assemblage refaits par le code
 *     d'aujourd'hui (`plancheEnVraiParLeCode`) ;
 *  b) gratuit, sans aucun appel : chaque image refaite de l'essai rejugée sur son verdict réel par le code d'aujourd'hui
 *     (`raisonsDuRefusEnVrai`, avec la zone de la case lue sur les boîtes de l'essai) ; le premier essai qui passe est
 *     gardé, mis à son format comme dans la tâche ;
 *  c) seulement pour les cases de `reprendre` encore refusées : UNE reprise à la charge du Studio
 *     (`reprendreDesCasesEnVrai`), avec leurs raisons d'aujourd'hui, relue, sous la borne `devisDUneReprise` et le plafond
 *     de l'essai.
 * Rien n'est relancé tout seul ; une panne arrête la reprise et le réassemblage se fait sans elle.
 */
export async function reassemblerLEssaiEnVrai(o: {
  dossier: string; sortie: string; planche: string; logo: string; reprendre?: NomElement[]; plafondEuros?: string; ai?: (q: Qui) => PlancheEnVraiAi;
  /** d) Les quatre petites versions du logo en haute définition, à la charge du Studio (LOGO_HD=1). */
  logoHd?: boolean; aiLogos?: (q: Qui) => LogosEnHdAi;
  /**
   * Le fichier du client (CLIENT_JSON) : ses faits à montrer, quand le client de l'essai (essai.json, écrit avant ses
   * réponses) n'en a pas (27 novembre 2026 : la reprise réelle de Mouture « avec les vrais faits » est partie sans eux, ni
   * ses noms exacts ni ses mentions, le client étant relu dans essai.json).
   */
  clientJson?: string;
}): Promise<ResultatDuReassemblage> {
  const sharp = (await import("sharp")).default;
  const P = await import("../../src/lib/syna-agent/planche-en-vrai");
  const T = await import("../../src/lib/syna-agent/planche-en-vrai-tache");
  const { logoDetoure } = await import("../../src/lib/syna-agent/brand-images");
  const { couleursDuLogo } = await import("../../src/lib/syna-agent/couleurs-du-logo");
  const lire = (f: string) => { const p = path.join(o.dossier, f); if (!fs.existsSync(p)) throw new Error(`${f} introuvable dans ${o.dossier} : rien n'est fait.`); return fs.readFileSync(p); };
  const essai = JSON.parse(String(lire("essai.json"))) as { client: ClientDeLEssai; donnees: DonneesDeLaPlanche };
  const inventaire = P.InventaireSchema.parse(JSON.parse(String(lire("inventaire-reponse.json"))));
  const anciennes = JSON.parse(String(lire("apercus/cases.json"))) as { boites: Record<string, [number, number, number, number]> };
  const demo = png(o.planche, "Planche choisie"), logoFini = png(o.logo, "Logo fini");
  const { donnees } = essai, laquelle = donnees.disposition, nom = essai.client.nom.trim(), personnes = false;
  const client: ClientDeLEssai = { ...essai.client, ...(!essai.client.faits?.length && o.clientJson ? ((b) => (Array.isArray(b.faits) && b.faits.length ? { faits: faitsDuFichier(b.faits) } : {}))(JSON.parse(fs.readFileSync(o.clientJson, "utf8")) as { faits?: unknown[] }) : {}) };
  // Ses faits à montrer (27 novembre 2026), gardés avec l'essai : sans eux, rien ne change.
  const faitsDuClient = await faitsPermisDuClient(client), avecFaits = aDesFaits(faitsDuClient) ? { faits: faitsDuClient } : {};
  fs.mkdirSync(path.join(o.sortie, "cases"), { recursive: true }); fs.mkdirSync(path.join(o.sortie, "logos"), { recursive: true });
  const ecrire = (f: string, c: string | Buffer) => { fs.mkdirSync(path.dirname(path.join(o.sortie, f)), { recursive: true }); fs.writeFileSync(path.join(o.sortie, f), c); return f; };
  const decoupe = await P.decouperLesApercus(demo, laquelle);

  // b) Le rejugement, sans appel.
  const cases: RejugementDeCase[] = [], images = new Map<NomElement, Buffer>();
  const formater = async (n: NomElement, brut: Buffer) => { const f = await P.auFormatFinal(n, brut); return f.ok ? (P.def(n).sansMargesBlanches ? await P.rognerLesMargesBlanches(f.png, decoupe.apercus.get(n)) : f.png) : null; };
  for (const n of P.NOMS_DES_ELEMENTS) {
    const ancienne = anciennes.boites[n], deborde = !!ancienne && P.entreDansUneBandeDeTitre(laquelle, ancienne);
    const c: RejugementDeCase = { element: n, essais: [], gardee: null, deborde };
    for (const tour of [1, 2]) {
      const hd = path.join(o.dossier, "cases", `${n}-${tour}-hd.png`), rel = path.join(o.dossier, "relectures", `${P.def(n).groupe}-${tour}-verdict.json`);
      if (!fs.existsSync(hd) || !fs.existsSync(rel)) continue;
      const r = JSON.parse(fs.readFileSync(rel, "utf8")) as { verdict: RelectureDuGroupe; raisons?: Record<string, string[]> };
      const v = r.verdict.images.find((x) => x.case === n);
      if (!v && !r.raisons?.[n]) continue;
      const photo = fs.readdirSync(path.join(o.dossier, "cases")).some((f) => f.startsWith(`${n}-${tour}-jointe-`) && f.endsWith("-produit.png"));
      const apres = P.raisonsDuRefusEnVrai(v, { inventaire: P.caseLue(inventaire, n), personnes, photo, element: n, deborde, logo: { nom, phrase: lignesDuTexte(donnees.phrase) }, produits: client.produits, ...avecFaits });
      c.essais.push({ tour, note: v?.note ?? null, raisonsAvant: r.raisons?.[n] ?? [], raisonsApres: apres });
      if (!apres.length && c.gardee == null) {
        const p = await formater(n, fs.readFileSync(hd));
        if (p) { images.set(n, p); c.gardee = tour; ecrire(`cases/${n}-gardee-hd.png`, p); }
      }
    }
    cases.push(c);
  }

  // Le logo et la route, comme dans l'essai.
  const det = await logoDetoure(logoFini);
  const couleurs = det.ok ? (await couleursDuLogo(det.png).catch(() => null))?.palette ?? null : null;
  const palette0 = { dark: "#1C2A24", primary: "#1C2A24", secondary: "#E8E4DC", accent: "#1C2A24", light: "#F9F8F4", ...(couleurs ?? {}) };
  const det2 = await logoDetoure(logoFini, palette0.dark), logo = det2.ok ? det2.png : logoFini;
  const route = { key: "A", name: nom, slogan: donnees.phrase, palette: palette0, board: { planche: { image: { id: "", w: 1536, h: 2304 }, logo: "", domaine: donnees.domaine, statut: donnees.statut, annee: donnees.annee, essais: 1, at: 0, ...(donnees.finitions?.length ? { finitions: donnees.finitions } : {}) } } } as unknown as import("../../src/lib/syna-agent/brand-routes").Route;

  // c) La reprise, seulement si elle est demandée, pour les cases encore refusées ; d) les quatre petites versions du logo en
  // haute définition, seulement avec LOGO_HD. Un seul plafond pour les deux ; sous la somme des maxima (reprises comprises),
  // l'essai part quand même et s'arrête proprement avant l'appel dont le pire cas dépasserait ce qui reste.
  let reprise: ResultatDuReassemblage["reprise"], logosEnHd: ResultatDuReassemblage["logosEnHd"], arret: string | undefined;
  const aReprendre = (o.reprendre ?? []).filter((n) => !images.has(n) && cases.find((c) => c.element === n)?.essais.length);
  const { separerSymbole } = await import("../../src/lib/syna-agent/planche-en-vrai-code");
  const separation = await separerSymbole(logo);
  // LES LOGOS EN HAUTE DÉFINITION DÉJÀ REÇUS (27 novembre 2026, réassemblage de Mouture après l'étape 5 : ses quatre
  // versions avaient été payées et gardées) : sans LOGO_HD, quand le dossier de l'essai garde leurs images reçues et leur
  // relecture (logos-hd/), elles sont reprises telles quelles et rejugées par le code d'aujourd'hui, sans aucun appel ni clé.
  const dejaRecus = !o.logoHd && !separation.fiable && fs.existsSync(path.join(o.dossier, "logos-hd", "relecture-logos-hd-verdict.json"));
  // Les versions reprises de l'aperçu (sans symbole séparable) : ce sont elles que LOGO_HD refait.
  const versionsHd = (o.logoHd || dejaRecus) && !separation.fiable ? P.VERSIONS_EN_HD.filter((v) => decoupe.apercus.has(P.LOGOS_EN_HD[v].tuile)) : [];
  if (aReprendre.length || (versionsHd.length && !dejaRecus)) {
    const maxMicro = (aReprendre.length ? T.devisDUneReprise(aReprendre).maxMicro : 0) + (versionsHd.length ? T.devisDesLogosEnHd(versionsHd.length).maxMicro : 0);
    const plafond = Number(String(o.plafondEuros ?? "").replace(",", "."));
    if (!Number.isFinite(plafond) || plafond <= 0) throw new Error("PLAFOND_ESSAI_EUR manquant ou illisible pour la reprise : rien n'est lancé.");
    // Sous la somme des maxima, l'essai part quand même (26 novembre 2026) : il s'arrête proprement avant l'appel dont le
    // pire cas dépasserait ce qui reste, et le dit.
    const avisHd = avisDuPlafond(Math.floor(plafond * 1_000_000), { plafondMinimalMicro: maxMicro });
    if (avisHd) console.log(avisHd);
    // Le garde-fou de l'essai : un seul plafond, un seul début, pour la reprise et les logos.
    process.env.STUDIO_ESSAI_PLAFOND_EUROS = String(plafond);
    process.env.STUDIO_ESSAI_DEBUT = String(Date.now());
  }
  if (aReprendre.length) {
    const r = await repriseDesCases({ client, inventaire, decoupe, logo, separation, nom, personnes, elements: aReprendre, raisons: new Map(aReprendre.map((n) => [n, cases.find((c) => c.element === n)!.essais.at(-1)!.raisonsApres])), debordes: cases.filter((c) => c.deborde).map((c) => c.element), ai: o.ai, ecrire, phrase: lignesDuTexte(donnees.phrase) });
    reprise = { elements: aReprendre, devis: r.devis, depenseMicro: r.depenseMicro, gardees: [...r.gardees.keys()] };
    arret = r.arret;
    for (const [n, p] of r.gardees) { images.set(n, p); cases.find((c) => c.element === n)!.gardee = "reprise"; ecrire(`cases/${n}-gardee-hd.png`, p); }
  }
  const gardesHd = new Map<VersionEnHd, Buffer>(), refusesHd: VersionEnHd[] = [];
  if (versionsHd.length && !arret) {
    const r = await logosEnHdDeLEssai({ client, decoupe, logo, nom, personnes, versions: versionsHd, aiLogos: dejaRecus ? rejeuDesLogosEnHd(o.dossier) : o.aiLogos, ecrire });
    for (const [v, p] of r.gardees) gardesHd.set(v, p);
    refusesHd.push(...versionsHd.filter((v) => !r.gardees.has(v) && r.tentees.includes(v)));
    logosEnHd = { versions: versionsHd, devis: r.devis, depenseMicro: r.depenseMicro, gardees: [...r.gardees.keys()], refusees: refusesHd, surLaPlanche: [] };
    arret = r.arret;
  }

  // a) Le code seul, puis l'assemblage.
  const code = await T.plancheEnVraiParLeCode({ demo, laquelle, inventaire, route, logo, images, phrase: donnees.phrase, ...avecFaits, ...(versionsHd.length ? { logosEnHd: { gardes: gardesHd, refuses: refusesHd } } : {}) });
  if (logosEnHd) logosEnHd.surLaPlanche = code.surLaPlancheEnHd;
  for (const [k, b] of Object.entries(code.versions)) ecrire(`logos/${k}.png`, b);
  ecrire("palette.json", `${JSON.stringify({ couleurs: code.palette, roles: code.roles }, null, 2)}\n`);
  ecrire("polices.json", `${JSON.stringify(code.polices, null, 2)}\n`);
  ecrire("planche-en-vrai.png", code.planche);
  // Ce que l'onglet Marque montre et que le zip donne : chaque image rognée au contenu, le site en une seule image.
  for (const [n, b] of code.montrees) ecrire(`montrees/${n}.png`, b);
  if (code.site) ecrire("montrees/site-ordinateur-et-telephone.png", code.site);
  // La comparaison : l'aperçu choisi à gauche, la planche réassemblée à droite, à la même taille.
  const W = 1000, H = 1500, titre = (t0: string) => Buffer.from(`<svg width="${W}" height="44"><rect width="100%" height="100%" fill="#ffffff"/><text x="8" y="30" font-family="sans-serif" font-size="26" font-weight="700" fill="#111">${t0}</text></svg>`);
  const gauche = await sharp(demo).resize(W, H, { fit: "fill" }).png().toBuffer(), droite = await sharp(code.planche).resize(W, H, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
  const comparaison = await sharp({ create: { width: 2 * W + 20, height: H + 44, channels: 3, background: "#ffffff" } })
    .composite([{ input: titre("Planche choisie (aperçu)"), left: 0, top: 0 }, { input: titre("Planche en vrai réassemblée (3072 × 4608)"), left: W + 20, top: 0 }, { input: gauche, left: 0, top: 44 }, { input: droite, left: W + 20, top: 44 }]).jpeg({ quality: 88 }).toBuffer();
  ecrire("comparaison-apercu-et-reassemblee.jpg", comparaison);
  // L'état et le projet mis à jour, comme après l'étape 4 normale (26 novembre 2026, « L'écran ne suit pas le
  // réassemblage. ») : les images gardées, les logos, la marque, la planche réassemblée, rangés dans le projet de l'essai
  // par la fonction du Studio (`enregistrerLaPlancheReassemblee`) ; etat.json et essai.json écrits dans le dossier de
  // sortie ; le parcours du projet réécrit : l'onglet Marque montre la planche réassemblée et ses images gardées.
  const enregistre = await enregistrerLeReassemblage({ dossier: o.dossier, sortie: o.sortie, client, donnees, demo, logoFini, inventaire, code, cases, images, ecrire });
  const res: ResultatDuReassemblage = { cases, gardees: images.size, planche: "planche-en-vrai.png", comparaison: "comparaison-apercu-et-reassemblee.jpg", palette: code.palette.map((p) => ({ hex: p.hex, nom: p.nom })), logosDeLApercu: code.depuisLApercu, ...(reprise ? { reprise } : {}), ...(logosEnHd ? { logosEnHd } : {}), ...(arret ? { arret } : {}), notes: code.notes, ...enregistre };
  ecrire("rejugement.json", `${JSON.stringify(res, null, 2)}\n`);
  const lignes = [
    `Réassemblage de la planche en vrai de « ${nom} » à partir de l'essai ${o.dossier} (aucun appel pour a) et b))`,
    `Images gardées : ${images.size} sur 17`,
    ...cases.map((c) => `  ${c.element} : ${c.gardee == null ? "l'aperçu garde sa case" : c.gardee === "reprise" ? "GARDÉE (reprise)" : `GARDÉE (essai ${c.gardee})`}${c.deborde ? " — aperçu de l'essai dans la bande d'un titre" : ""}${c.essais.map((e) => `\n    essai ${e.tour} (note ${e.note ?? "—"}) : avant ${e.raisonsAvant.length ? e.raisonsAvant.join(" ; ") : "gardée"} → aujourd'hui ${e.raisonsApres.length ? e.raisonsApres.join(" ; ") : "gardée"}`).join("")}`),
    `Logos repris de l'aperçu : ${code.depuisLApercu.join(", ") || "aucun"} ; séparation du symbole ${code.separation.fiable ? "fiable" : `non fiable (${code.separation.raison})`}`,
    `Palette : ${code.palette.map((p) => `${p.hex} ${p.nom}`).join(" ; ")}`,
    ...(reprise ? [`Reprise : ${reprise.elements.join(", ")} ; devis probable ${euros(reprise.devis.probableMicro)}, au plus ${euros(reprise.devis.maxMicro)} ; dépense comptée ${euros(reprise.depenseMicro)} ; gardées : ${reprise.gardees.join(", ") || "aucune"}`] : []),
    ...(logosEnHd ? [`Logos en haute définition : ${logosEnHd.versions.join(", ")} ; devis probable ${euros(logosEnHd.devis.probableMicro)}, au plus ${euros(logosEnHd.devis.maxMicro)} ; dépense comptée ${euros(logosEnHd.depenseMicro)} ; gardées : ${logosEnHd.gardees.join(", ") || "aucune"} ; refusées deux fois (l'agrandissement de l'aperçu reste) : ${logosEnHd.refusees.join(", ") || "aucune"} ; posées sur la planche : ${logosEnHd.surLaPlanche.join(", ") || "aucune (la planche garde l'aperçu, la haute définition sert aux fichiers)"}`] : []),
    ...(arret ? [`ARRÊT : ${arret}`] : []),
    `État et projet mis à jour : etat.json et essai.json (projet ${enregistre.projectId}${enregistre.projetCree ? ", créé dans cette base : celui de l'essai n'y était pas" : ""}) ; l'onglet Marque montre la planche réassemblée et ses ${images.size} images gardées`,
    ...code.notes.map((n) => `  note : ${n}`),
  ];
  ecrire("rapport.txt", `${lignes.join("\n")}\n`);
  return res;
}

/**
 * L'enregistrement d'un réassemblage dans la base de l'essai (DATA_DIR), comme l'étape 4 normale : le projet de l'essai
 * (essai.json du dossier de l'essai) s'il est dans cette base avec sa planche choisie et son logo fini ; sinon un projet
 * fictif est créé comme dans l'essai (le client de l'essai, sans photo de produit), avec la planche choisie et le logo fini
 * donnés, et c'est dit. Puis la fonction du Studio (`enregistrerLaPlancheReassemblee`), etat.json (sans l'inventaire, comme
 * l'essai ; inventaire-reponse.json copié à côté) et essai.json, et le parcours (`enregistrerLeParcours`). Aucun appel.
 */
async function enregistrerLeReassemblage(o: {
  dossier: string; sortie: string; client: ClientDeLEssai; donnees: DonneesDeLaPlanche; demo: Buffer; logoFini: Buffer; inventaire: Inventaire;
  code: Awaited<ReturnType<typeof import("../../src/lib/syna-agent/planche-en-vrai-tache").plancheEnVraiParLeCode>>;
  cases: RejugementDeCase[]; images: ReadonlyMap<NomElement, Buffer>; ecrire: (f: string, c: string | Buffer) => string;
}): Promise<{ projectId: string; conversationId: string; etat: string; projetCree: boolean }> {
  const T = await import("../../src/lib/syna-agent/planche-en-vrai-tache");
  const P = await import("../../src/lib/syna-agent/planche-en-vrai");
  const { one, run } = await import("../../src/lib/db");
  const { getAsset, saveAsset } = await import("../../src/lib/library");
  const { runWithLang } = await import("../../src/lib/i18n-server");
  const { setJsonSetting } = await import("../../src/lib/settings");
  const lireJson = <X>(f: string): X | null => { const p = path.join(o.dossier, f); try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) as X : null; } catch { return null; } };
  const essai = lireJson<{ projectId?: string }>("essai.json"), avant = lireJson<EtatPlancheEnVrai>("etat.json");
  const existe = (id: string | undefined) => !!id && !!getAsset(id);
  let p = essai?.projectId ? one<{ id: string; user_id: string }>("SELECT id, user_id FROM projects WHERE id=?", essai.projectId) : undefined;
  let demoId = avant?.demo, logoId = avant?.logo, projetCree = false;
  if (!p || !existe(demoId) || !existe(logoId)) {
    // Le projet de l'essai n'est pas dans cette base : un projet fictif, comme dans l'essai.
    setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, true);
    const { account, project } = await import("../../tests/conversation209-fixtures");
    const u = await account();
    const projectId = project(u, typeDuProjet(o.client)) as string;
    run("UPDATE projects SET name=? WHERE id=?", o.client.nom, projectId);
    demoId = (await saveAsset({ userId: u.id, projectId, data: o.demo, name: "planche-choisie.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { plancheDeMarque: { key: "A", tour: 1, nom: o.client.nom, disposition: o.donnees.disposition } } })).id;
    logoId = (await saveAsset({ userId: u.id, projectId, data: o.logoFini, name: "logo-fini.png", mime: "image/png", role: "logo", origin: "generated", status: "ready" })).id;
    p = { id: projectId, user_id: u.id };
    projetCree = true;
  }
  const who = { userId: p.user_id, projectId: p.id };
  const aRanger = new Map<NomElement, import("../../src/lib/syna-agent/planche-en-vrai-tache").ImageARanger>();
  for (const c of o.cases) {
    const png = o.images.get(c.element) ?? null;
    const garde = typeof c.gardee === "number" ? c.essais.find((e) => e.tour === c.gardee) : null;
    aRanger.set(c.element, png
      ? { png, essais: c.gardee === "reprise" ? c.essais.length + 1 : Number(c.gardee), verdict: garde ? { note: garde.note, rejuge: true } : null }
      : { png: null, essais: c.essais.length, raison: c.essais.length ? `refusée au rejugement : ${c.essais.at(-1)!.raisonsApres.join(" ; ")}` : "aucune image dans l'essai" });
  }
  const etat = await runWithLang({ ui: "fr", content: "fr" }, () => T.enregistrerLaPlancheReassemblee({
    who, avant: { key: avant?.key ?? "A", demo: demoId!, logo: logoId!, laquelle: o.donnees.disposition, notes: avant?.notes ?? [] }, inventaire: o.inventaire, code: o.code, images: aRanger,
    notes: [`réassemblage de l'essai ${path.basename(o.dossier)} : ${o.images.size} image(s) gardée(s) sur 17 au rejugement`],
  }));
  const fichierEtat = o.ecrire("etat.json", `${JSON.stringify({ ...etat, inventaire: undefined }, null, 2)}\n`);
  o.ecrire("inventaire-reponse.json", `${JSON.stringify(o.inventaire, null, 2)}\n`);
  const { conversationId } = await runWithLang({ ui: "fr", content: "fr" }, () => enregistrerLeParcours({ userId: who.userId, projectId: who.projectId, nom: o.client.nom, etat, donnees: o.donnees }));
  o.ecrire("essai.json", `${JSON.stringify({ client: o.client, donnees: o.donnees, projectId: who.projectId, conversationId }, null, 2)}\n`);
  return { projectId: who.projectId, conversationId, etat: fichierEtat, projetCree };
}

/** La reprise de quelques cases, à la charge du Studio (c) du réassemblage), par `reprendreDesCasesEnVrai`. */
async function repriseDesCases(o: {
  client: ClientDeLEssai; inventaire: Inventaire; decoupe: import("../../src/lib/syna-agent/planche-en-vrai").Decoupe; logo: Buffer;
  separation: import("../../src/lib/syna-agent/planche-en-vrai-code").Separation; nom: string; personnes: boolean; elements: NomElement[];
  raisons: Map<NomElement, string[]>; debordes: string[]; ai?: (q: Qui) => PlancheEnVraiAi; ecrire: (f: string, c: string | Buffer) => string;
  /** La phrase du logo, toutes ses lignes (jamais en trop ; dite au relecteur). */ phrase: readonly string[];
}): Promise<{ devis: { maxMicro: number; probableMicro: number }; depenseMicro: number; gardees: Map<NomElement, Buffer>; arret?: string }> {
  const T = await import("../../src/lib/syna-agent/planche-en-vrai-tache");
  const { id } = await import("../../src/lib/db");
  const { account, project } = await import("../../tests/conversation209-fixtures");
  const { CostCapReached, depensesDeLaTache, withTrace } = await import("../../src/lib/ai/trace");
  const { PlafondDeLEssaiAtteint } = await import("../../src/lib/ai/plafond-essai");
  const { runForUser } = await import("../../src/lib/ai/access");
  const { runWithLang } = await import("../../src/lib/i18n-server");
  // Le plafond de l'essai est vérifié et posé par l'appelant (`reassemblerLEssaiEnVrai`), une seule fois.
  const devis = T.devisDUneReprise(o.elements);
  const u = await account();
  const projectId = project(u, typeDuProjet(o.client)) as string;
  const jobId = `reassemblage-en-vrai-${id()}`, qui: Qui = { userId: u.id, projectId, jobId };
  const brut = o.ai ? o.ai(qui) : T.vraisAppelsEnVrai(qui);
  // Les appels du Studio, tels quels, avec ce qui part et ce qui revient écrit tout de suite (un arrêt ne perd rien).
  const ai: PlancheEnVraiAi = {
    inventaire: brut.inventaire,
    refaire: async (d, cle) => {
      o.ecrire(`reprise/${d.element}-texte-envoye.txt`, d.texte);
      d.jointes.forEach((j, i) => o.ecrire(`reprise/${d.element}-jointe-${i + 1}-${j.role}.png`, j.data));
      const r = await brut.refaire(d, cle);
      o.ecrire(`reprise/${d.element}-hd.png`, r.png);
      if (r.recu) o.ecrire(`reprise/${d.element}-recu.json`, `${JSON.stringify(r.recu, null, 2)}\n`);
      return r;
    },
    relire: async (images, demande, cle) => {
      o.ecrire(`reprise/${cle}-demande.txt`, demande);
      const v = await brut.relire(images, demande, cle);
      o.ecrire(`reprise/${cle}-verdict.json`, `${JSON.stringify(v, null, 2)}\n`);
      return v;
    },
  };
  const gardees = new Map<NomElement, Buffer>();
  let arret: string | undefined;
  await runWithLang({ ui: "fr", content: "fr" }, () => runForUser(u.id, () => withTrace({ jobId, projectId, costCapMicro: 0, studioCapMicro: devis.maxMicro }, async () => {
    try {
      const res = await T.reprendreDesCasesEnVrai({ ai, nom: o.nom, personnes: o.personnes, logo: o.logo, separation: o.separation, inventaire: o.inventaire, decoupe: o.decoupe, elements: o.elements, raisons: o.raisons, debordes: o.debordes,
        // Les produits de la fiche et la phrase du logo (27 novembre 2026, reprise réelle de Mouture : sans eux, la ligne des
        // étiquettes manquait au dessinateur et la phrase du logo était comptée en trop).
        produits: o.client.produits, phrase: o.phrase, ...((f) => (aDesFaits(f) ? { faits: f } : {}))(await faitsPermisDuClient(o.client)) });
      for (const [n, r] of res) { o.ecrire(`reprise/${n}-raisons.json`, `${JSON.stringify(r.essais.map((e) => e.raisons), null, 2)}\n`); if (r.ok && r.png) gardees.set(n, r.png); }
    } catch (e) {
      arret = e instanceof PlafondDeLEssaiAtteint ? `le garde-fou de l'essai a refusé un appel : ${e.message}` : e instanceof CostCapReached ? `la borne du Studio a refusé un appel : ${e.message}` : `un appel a échoué, jamais relancé : ${messageAvecCause(e).slice(0, 700)}`;
    }
  })));
  return { devis, depenseMicro: depensesDeLaTache(jobId).total, gardees, ...(arret ? { arret } : {}) };
}

/**
 * d) LES QUATRE PETITES VERSIONS DU LOGO EN HAUTE DÉFINITION, à la charge du Studio (LOGO_HD=1), par la fonction du Studio
 * (`refaireLesLogosEnHdDeLaPlanche`) : chacune refaite à partir de sa tuile de l'aperçu, logo officiel joint, relues en un
 * appel, une reprise des refusées ; sous la borne `devisDesLogosEnHd` et le plafond de l'essai (posé par l'appelant). Ce qui
 * part et ce qui revient est écrit tout de suite dans logos-hd/ (un arrêt ne perd rien). Une panne arrête, jamais relancée.
 */
/**
 * Le rejeu des logos en haute définition déjà reçus (aucun appel) : chaque image reçue et chaque relecture sont relues dans
 * logos-hd/ du dossier de l'essai. Une image qui n'y est pas (une reprise jamais faite) arrête le rejeu, sans appel.
 */
export function rejeuDesLogosEnHd(dossier: string): (q: Qui) => LogosEnHdAi {
  return () => ({
    refaire: async (_d, cle) => {
      const f = path.join(dossier, "logos-hd", `${cle}-recue.png`);
      if (!fs.existsSync(f)) throw new Error(`rejeu des logos en haute définition : ${cle} n'a jamais été reçu ; aucun appel n'est fait`);
      const r = path.join(dossier, "logos-hd", `${cle}-recu.json`);
      return { png: fs.readFileSync(f), recu: fs.existsSync(r) ? JSON.parse(fs.readFileSync(r, "utf8")) : null };
    },
    relire: async (_images, _demande, cle) => {
      const f = path.join(dossier, "logos-hd", `${cle}-verdict.json`);
      if (!fs.existsSync(f)) throw new Error(`rejeu des logos en haute définition : la relecture ${cle} n'a jamais été reçue ; aucun appel n'est fait`);
      return JSON.parse(fs.readFileSync(f, "utf8"));
    },
  });
}
async function logosEnHdDeLEssai(o: {
  client: ClientDeLEssai; decoupe: import("../../src/lib/syna-agent/planche-en-vrai").Decoupe; logo: Buffer; nom: string; personnes: boolean;
  versions: VersionEnHd[]; aiLogos?: (q: Qui) => LogosEnHdAi; ecrire: (f: string, c: string | Buffer) => string;
}): Promise<{ devis: { maxMicro: number; probableMicro: number }; depenseMicro: number; gardees: Map<VersionEnHd, Buffer>; tentees: VersionEnHd[]; arret?: string }> {
  const T = await import("../../src/lib/syna-agent/planche-en-vrai-tache");
  const { id } = await import("../../src/lib/db");
  const { account, project } = await import("../../tests/conversation209-fixtures");
  const { CostCapReached, depensesDeLaTache, withTrace } = await import("../../src/lib/ai/trace");
  const { PlafondDeLEssaiAtteint } = await import("../../src/lib/ai/plafond-essai");
  const { runForUser } = await import("../../src/lib/ai/access");
  const { runWithLang } = await import("../../src/lib/i18n-server");
  const { aLaChargeDuStudio } = await import("../../src/lib/billing");
  const devis = T.devisDesLogosEnHd(o.versions.length);
  const u = await account();
  const projectId = project(u, typeDuProjet(o.client)) as string;
  const jobId = `logos-hd-en-vrai-${id()}`, qui: Qui = { userId: u.id, projectId, jobId };
  const brut = o.aiLogos ? o.aiLogos(qui) : T.vraisAppelsDesLogosEnHd(qui);
  const ai: LogosEnHdAi = {
    refaire: async (d, cle) => {
      o.ecrire(`logos-hd/${cle}-texte-envoye.txt`, d.texte);
      d.jointes.forEach((j, i) => o.ecrire(`logos-hd/${cle}-jointe-${i + 1}-${j.role}.png`, j.data));
      const r = await brut.refaire(d, cle);
      o.ecrire(`logos-hd/${cle}-recue.png`, r.png);
      if (r.recu) o.ecrire(`logos-hd/${cle}-recu.json`, `${JSON.stringify(r.recu, null, 2)}\n`);
      return r;
    },
    relire: async (images, demande, cle) => {
      o.ecrire(`logos-hd/${cle}-demande.txt`, demande);
      const v = await brut.relire(images, demande, cle);
      o.ecrire(`logos-hd/${cle}-verdict.json`, `${JSON.stringify(v, null, 2)}\n`);
      return v;
    },
  };
  const gardees = new Map<VersionEnHd, Buffer>(), tentees: VersionEnHd[] = [];
  let arret: string | undefined;
  await runWithLang({ ui: "fr", content: "fr" }, () => runForUser(u.id, () => withTrace({ jobId, projectId, costCapMicro: 0, studioCapMicro: devis.maxMicro }, async () => {
    try {
      // Tout à la charge du Studio (accord du propriétaire pour l'essai d'Écume) : le premier tour comme la reprise.
      const res = await aLaChargeDuStudio(() => T.refaireLesLogosEnHdDeLaPlanche({ ai, nom: o.nom, personnes: o.personnes, logo: o.logo, tuiles: o.decoupe.apercus, versions: o.versions }));
      for (const [v, r] of res) {
        tentees.push(v);
        o.ecrire(`logos-hd/${v}-raisons.json`, `${JSON.stringify(r.essais.map((e) => ({ tour: e.tour, raisons: e.raisons })), null, 2)}\n`);
        if (r.ok && r.png) { gardees.set(v, r.png); o.ecrire(`logos-hd/${v}-gardee-sans-fond.png`, r.png); }
      }
    } catch (e) {
      arret = e instanceof PlafondDeLEssaiAtteint ? `le garde-fou de l'essai a refusé un appel : ${e.message}` : e instanceof CostCapReached ? `la borne du Studio a refusé un appel : ${e.message}` : `un appel a échoué, jamais relancé : ${messageAvecCause(e).slice(0, 700)}`;
    }
  })));
  return { devis, depenseMicro: depensesDeLaTache(jobId).total, gardees, tentees, ...(arret ? { arret } : {}) };
}
