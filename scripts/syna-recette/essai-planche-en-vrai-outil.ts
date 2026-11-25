/**
 * L'essai réel de la planche en vrai (la planche de démonstration choisie, refaite à l'identique en haute définition) : la
 * partie qui se teste (appels simulés dans les essais). Le script à lancer est scripts/syna-recette/essai-planche-en-vrai.mts,
 * qui l'utilise ; son en-tête dit tout. Il n'appelle que les fonctions du Studio (planche-en-vrai.ts, planche-en-vrai-code.ts,
 * planche-en-vrai-tache.ts : `plancheEnVrai`, `vraisAppelsEnVrai`, `devisDeLaPlancheEnVrai`). Rien n'est relancé.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { PlancheEnVraiAi } from "../../src/lib/syna-agent/planche-en-vrai-tache";
import type { EtatPlancheEnVrai, Inventaire, Laquelle, NomElement, RelectureDuGroupe } from "../../src/lib/syna-agent/planche-en-vrai";
import type { StatutDuDomaine } from "../../src/lib/syna-agent/planche-de-marque";
import { RACINE, clientDeLEssai, ficheDuClient, type ClientDeLEssai, type LigneDeDepense } from "./essai-planches-outil";
import { euros } from "./essai-esquisses-outil";

export { RACINE, clientDeLEssai, euros };
export type { ClientDeLEssai };

// ---------------------------------------------------------------- les entrées

/** Ce que la planche choisie porte déjà (son bloc 10) et ce que le code en garde : le domaine, l'année, la disposition, la phrase. */
export type DonneesDeLaPlanche = { domaine: string | null; statut: StatutDuDomaine; annee: number; disposition: Laquelle; phrase: string };

/**
 * Les données de la planche choisie : DOMAINE, DOMAINE_STATUT (« disponible », « a_verifier » ou « adresse_a_choisir »),
 * ANNEE, DISPOSITION (« standard » ou « animaux »), PHRASE (la phrase choisie sous le nom, vide sans elle). Pour Racine par
 * défaut, celles de sa planche A (essai du 25 novembre 2026 : « racine-officiel.fr — disponible », « © 2026 Racine »,
 * disposition standard, logo sans phrase). Pour un autre client, le domaine et l'année sont exigés : rien n'est deviné.
 */
export function donneesDeLaPlanche(client: ClientDeLEssai, env: Record<string, string | undefined> = process.env): DonneesDeLaPlanche {
  const racine = client.nom === RACINE.nom && client.metier === RACINE.metier;
  const statut = (env.DOMAINE_STATUT?.trim() || (racine || env.DOMAINE ? "disponible" : "")) as StatutDuDomaine;
  if (!["disponible", "a_verifier", "adresse_a_choisir"].includes(statut)) throw new Error("Statut du domaine manquant ou faux (DOMAINE_STATUT : « disponible », « a_verifier » ou « adresse_a_choisir ») : rien n'est lancé.");
  const domaine = env.DOMAINE?.trim() || (racine ? "racine-officiel.fr" : null);
  if (!domaine && statut !== "adresse_a_choisir") throw new Error("Domaine de la planche manquant (DOMAINE, tel qu'il est écrit sur la planche choisie) : rien n'est lancé.");
  const annee = Number(env.ANNEE?.trim() || (racine ? "2026" : ""));
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2200) throw new Error("Année de la planche manquante ou fausse (ANNEE, celle du « © » de la planche choisie) : rien n'est lancé.");
  const disposition = (env.DISPOSITION?.trim() || "standard") as Laquelle;
  if (disposition !== "standard" && disposition !== "animaux") throw new Error("Disposition fausse (DISPOSITION : « standard » ou « animaux ») : rien n'est lancé.");
  return { domaine: statut === "adresse_a_choisir" ? null : domaine, statut, annee, disposition, phrase: env.PHRASE?.trim() ?? "" };
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
    slogan: o.donnees.phrase, sloganTone: "", promise: "", territory: "", ground: "blanc" as const, palette: roles, paletteFamily: "",
    fonts: { heading: etat.polices?.titres.handle ?? "inter_n7", body: etat.polices?.textes.handle ?? "inter_n4" }, fontStyle: "",
    tone: { adjectives: [], avoid: [] }, logoStyle: "lettrage" as const, logoIdea: "", why: "",
    board: {
      idea: { belief: "", confession: "", confessionSupport: 0, enemy: "", proof: "", cost: "" }, nameCheck: "non_verifie" as const,
      lines: [], toProve: [], voice: { sliders: [], thisNotThat: [], houseWords: [], bannedWords: [] }, signs: [],
      wordmark: { case: "asis" as const, tracking: 0, align: "gauche" as const, dot: false, symbolPlace: "gauche" as const },
      object: { kind: "carte" as const, front: [o.nom], back: [] },
      images: { logo: logoFini },
      planche: { image: dims, logo: etat.logo, domaine: o.donnees.domaine, statut: o.donnees.statut, annee: o.donnees.annee, essais: 1, at },
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
};
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
export async function essaiDeLaPlancheEnVrai(o: { sortie: string; plafondEuros: string; planche: string; logo: string; client: ClientDeLEssai; donnees: DonneesDeLaPlanche; ai?: (q: Qui) => PlancheEnVraiAi }): Promise<ResultatEnVrai> {
  const plafond = Number(o.plafondEuros.replace(",", "."));
  if (!Number.isFinite(plafond) || plafond <= 0) throw new Error("PLAFOND_ESSAI_EUR manquant ou illisible : rien n'est lancé.");
  const demo = png(o.planche, "Planche choisie"), logoFini = png(o.logo, "Logo fini");
  const client = o.client, donnees = o.donnees;
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
  const projectId = project(u, client.kind === "produits" ? "products" : "services") as string;
  run("UPDATE projects SET name=? WHERE id=?", client.nom, projectId);
  const jobId = `essai-planche-en-vrai-${id()}`;
  const qui: Qui = { userId: u.id, projectId, jobId };
  const personnes = peopleAllowed(projectId);
  const fiche = await ficheDuClient(client, projectId);
  const demoAsset = await saveAsset({ userId: u.id, projectId, data: demo, name: "planche-choisie.png", mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { plancheDeMarque: { key: "A", tour: 1, nom: client.nom, disposition: donnees.disposition } } });
  const logoAsset = await saveAsset({ userId: u.id, projectId, data: logoFini, name: "logo-fini.png", mime: "image/png", role: "logo", origin: "generated", status: "ready" });
  // Les couleurs de la marque, tirées du logo par le Studio (comme à l'adoption du logo) : elles donnent l'encre de la planche.
  const det = await logoDetoure(logoFini);
  const couleurs = det.ok ? (await couleursDuLogo(det.png).catch(() => null))?.palette ?? null : null;
  const palette = { dark: "#1C2A24", primary: "#1C2A24", secondary: "#E8E4DC", accent: "#1C2A24", light: "#F9F8F4", ...(couleurs ?? {}) };
  const route = { key: "A", name: client.nom, slogan: donnees.phrase, palette, board: { planche: { image: { id: demoAsset.id, w: 1536, h: 2304 }, logo: logoAsset.id, domaine: donnees.domaine, statut: donnees.statut, annee: donnees.annee, essais: 1, at: debut } } };

  const brut: PlancheEnVraiAi = o.ai ? o.ai(qui) : T.plancheEnVraiDeps.ai ? T.plancheEnVraiDeps.ai(jobId) : T.vraisAppelsEnVrai(qui);
  const res: ResultatEnVrai = { client, donnees, apercus: [], refusALaDecoupe: [], cases: [], relectures: [], logos: [], depenseMicro: 0, appels: [], devis };
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
      ecrireFichier("inventaire-demande.txt", `${P.INVENTAIRE_SYSTEM}\n\n--- demande ---\n${demande}\n\n--- images jointes, dans l'ordre (${images.length}) ---\n${images.map((im, i) => `${i + 1}. ${im.label} (${im.data.length} octets, sha256 ${sha(im.data)})`).join("\n")}\n`);
      ecrireFichier("inventaire-logo-joint.png", images.at(-1)!.data);
      const v = await garder(() => brut.inventaire(images, demande));
      res.inventaire = v;
      ecrireFichier("inventaire-reponse.json", json(v));
      return v;
    },
    refaire: async (d, cle) => {
      const tour = cle.endsWith("-r1") ? 2 : 1, e = essaiDe(d.element, tour), base = `cases/${d.element}-${tour}`;
      e.texte = ecrireFichier(`${base}-texte-envoye.txt`, d.texte);
      e.jointes = d.jointes.map((j, i) => ({ role: j.role, fichier: ecrireFichier(`${base}-jointe-${i + 1}-${j.role}.png`, j.data) }));
      const r = await garder(() => brut.refaire(d, cle));
      e.brute = ecrireFichier(`${base}-hd.png`, r.png);
      if (r.recu) e.recu = ecrireFichier(`${base}-recu.json`, json(r.recu));
      return r;
    },
    relire: async (images, demande, cle) => {
      const tour = cle.endsWith("-r1") ? 2 : 1, groupe = cle.replace(/^relecture-/, "").replace(/-r1$/, ""), base = `relectures/${groupe}-${tour}`;
      ecrireFichier(`${base}-demande.txt`, `${P.RELECTEUR_EN_VRAI}\n\n--- demande ---\n${demande}\n\n--- images jointes, dans l'ordre (${images.length}) ---\n${images.map((im, i) => `${i + 1}. ${im.label} (${im.data.length} octets, sha256 ${sha(im.data)})`).join("\n")}\n`);
      const v = await garder(() => brut.relire(images, demande, cle));
      // Les raisons du refus, comptées par le code du Studio comme dans la tâche (raisonsDuRefusEnVrai).
      const relues = images.filter((im) => im.label.endsWith(" refaite")).map((im) => im.label.replace(/ refaite$/, "") as NomElement);
      const raisons: Record<string, string[]> = {};
      for (const n of relues) {
        const photo = images.some((im) => im.label === `${n} produit`);
        raisons[n] = P.raisonsDuRefusEnVrai(v.images.find((x) => x.case === n), { inventaire: P.caseLue(res.inventaire, n), personnes, photo });
        const e = essaiDe(n, tour);
        e.raisons = raisons[n]; e.verdict = v.images.find((x) => x.case === n) ?? null;
      }
      res.relectures.push({ cle, groupe, tour, verdict: v, fichier: ecrireFichier(`${base}-verdict.json`, json({ verdict: v, raisons, gardees: Object.entries(raisons).filter(([, r]) => !r.length).map(([n]) => n) })) });
      return v;
    },
  };
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
    `Données de la planche : ${copyright(donnees.annee, client.nom)} ; ${mentionDuDomaine({ domaine: donnees.domaine, statut: donnees.statut })} ; phrase sous le nom : ${donnees.phrase ? `« ${donnees.phrase} »` : "aucune"}`,
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
      return { etape: c.step, fournisseur: c.provider, modeleDemande: c.requested_model, modeleServi: c.served_model, unite: c.unit, jetonsEntree: c.input_tokens, jetonsCacheLus: c.cache_read_tokens, jetonsCacheEcrits: c.cache_write_tokens, jetonsSortie: c.output_tokens, quantite: c.quantity, effort: c.effort, fin: c.stop_reason, dureeMs: c.latency_ms, coutMicro: c.cost, estime: !!c.estimated, statut: c.status, cle: c.usage_key, details };
    };
    res.appels = reservations.map((r) => ({ cle: r.operation_key ?? appelDe(r)?.usage_key ?? null, task: r.task ?? null, modele: r.model ? `${r.provider ?? ""}:${r.model}` : null, studio: !!r.studio, reserveMicro: r.amount, reelMicro: r.actual ?? null, statut: r.status, ...(appelDe(r) ? { appel: detail(appelDe(r)) } : {}) }));
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
    if (res.arret) lignes.push("", `ARRÊT : ${res.arret}`);
    ecrireFichier("rapport.txt", `${lignes.join("\n")}\n`);
    return res;
  };
  const raisonDeLArret = (e: unknown) => e instanceof PlafondDeLEssaiAtteint ? `le garde-fou de l'essai a refusé un appel : ${e.message}`
    : e instanceof CostCapReached ? `le plafond de la tâche (celui du Studio) a refusé un appel : ${e.message}`
      : `un appel a échoué, jamais relancé : ${String((e as Error)?.message ?? e).slice(0, 400)}`;

  ecrireFichier("fiche-du-client.txt", `${fiche}\n`);
  return runWithLang({ ui: "fr", content: "fr" }, () => runForUser(u.id, () => withTrace({ jobId, projectId, costCapMicro: devis.devisDuStudio.maxMicro, studioCapMicro: devis.devisDuStudio.studioMaxMicro }, async () => {
    let etat: EtatPlancheEnVrai;
    try {
      etat = await T.plancheEnVrai({ ctx, ai, who: { userId: u.id, projectId }, route: route as never, logoAssetId: logoAsset.id, personnes, phrase: donnees.phrase });
    } catch (e) { res.arret = raisonDeLArret(erreur ?? e); return ecrire(); }
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
    const parLEssai = arretParLEssai(jobId);
    if (parLEssai) res.arret = raisonDeLArret(parLEssai);
    return ecrire();
  })));
}
