/**
 * LE CLIENT INVENTÉ D'UN ESSAI RÉEL, commun aux quatre scripts d'essai (esquisses, finalisation, planches, planche en
 * vrai) et à l'écran de la planche en vrai. Aucun client n'est imposé : le client se donne par un fichier JSON
 * (CLIENT_JSON, par exemple scripts/syna-recette/clients/ecume.json) ou par les variables CLIENT_NOM, CLIENT_METIER,
 * CLIENT_TYPE (« produits » ou « services »), CLIENT_PRODUITS (séparés par « ; ») et CLIENT_DESCRIPTEUR. Une variable
 * donnée l'emporte sur le fichier. Rien d'incomplet n'est lancé : ce qui manque est dit, et rien ne part.
 *
 * Un client qui n'a pas encore de nom (essai des noms, essai-noms.mts) : sa fiche n'a pas de « nom » ; le nom qu'il choisit
 * parmi les noms vérifiés est ensuite donné aux autres scripts par CLIENT_NOM, qui l'emporte sur le fichier. Facultatifs,
 * avec ses mots : « prix » (ses prix, même approximatifs), « clientele » (à qui il vend), « gouts » (l'image qu'il veut
 * donner, en quelques mots). Ils vont dans sa fiche comme ses réponses de départ dans le Studio (prix, client idéal, image
 * voulue).
 */
import fs from "node:fs";

export const euros = (micro: number) => `${(micro / 1_000_000).toFixed(4).replace(".", ",")} €`;

/** Le client inventé de l'essai : ce que sa fiche dit, avec ses mots. */
export type ClientDeLEssai = {
  nom: string;
  /** Son activité en mots simples, telle qu'il la dirait (« savonnerie artisanale qui vend en ligne … »). */
  metier: string;
  kind: "produits" | "services";
  /** Ses produits ou prestations réels, avec ses mots. */
  produits: string[];
  /** Le mot du métier pour les adresses de remplacement (findDomains), facultatif. */
  descripteur?: string | null;
  /** Ses prix, avec ses mots (réponse « prix » du départ), facultatif. */
  prix?: string | null;
  /** À qui il vend, avec ses mots (réponse « client idéal » du départ), facultatif. */
  clientele?: string | null;
  /** L'image qu'il veut donner, en quelques mots (réponse « image voulue » du départ), facultatif. */
  gouts?: string | null;
  /**
   * Ses faits à montrer (27 novembre 2026, `faits-a-montrer.ts`), tels que le chef d'orchestre, qui joue le client, y a
   * répondu (enregistrés par `faits-de-l-essai.mts`, gratuit) : facultatif ; sans eux, rien ne change.
   */
  faits?: import("../../src/lib/syna-agent/faits-a-montrer").FaitAMontrer[];
};

/**
 * Le client de l'essai, sans aucune valeur par défaut. `sansNom` : le client n'a pas encore de nom (l'essai des noms) ;
 * un nom donné quand même est refusé, pour que les noms proposés ne partent jamais d'un nom déjà choisi.
 */
export function clientDeLEssai(env: Record<string, string | undefined> = process.env, o: { sansNom?: boolean } = {}): ClientDeLEssai {
  let brut: Partial<ClientDeLEssai> & Record<string, unknown> = {};
  if (env.CLIENT_JSON) {
    if (!fs.existsSync(env.CLIENT_JSON)) throw new Error(`Fichier du client introuvable (CLIENT_JSON) : ${env.CLIENT_JSON}. Rien n'est lancé.`);
    try { brut = JSON.parse(fs.readFileSync(env.CLIENT_JSON, "utf8")); } catch { throw new Error(`Fichier du client illisible (CLIENT_JSON, un JSON { nom, metier, kind, produits, descripteur }) : ${env.CLIENT_JSON}. Rien n'est lancé.`); }
  }
  const donne = env.CLIENT_JSON || env.CLIENT_NOM || env.CLIENT_METIER || env.CLIENT_TYPE || env.CLIENT_PRODUITS;
  if (!donne) throw new Error("Client de l'essai manquant : donnez CLIENT_JSON (par exemple scripts/syna-recette/clients/ecume.json) ou CLIENT_NOM, CLIENT_METIER, CLIENT_TYPE et CLIENT_PRODUITS. Aucun client n'est pris par défaut : rien n'est lancé.");
  const liste = (t?: string) => t?.split(";").map((x) => x.trim()).filter(Boolean);
  const c: ClientDeLEssai = {
    nom: String(env.CLIENT_NOM ?? brut.nom ?? "").normalize("NFC").trim(),
    metier: String(env.CLIENT_METIER ?? brut.metier ?? "").trim(),
    kind: String(env.CLIENT_TYPE ?? brut.kind ?? "").trim() as ClientDeLEssai["kind"],
    produits: liste(env.CLIENT_PRODUITS) ?? (Array.isArray(brut.produits) ? brut.produits : []).map((x) => String(x).trim()).filter(Boolean),
    descripteur: String(env.CLIENT_DESCRIPTEUR ?? brut.descripteur ?? "").trim() || null,
    ...(String(brut.prix ?? "").trim() ? { prix: String(brut.prix).trim() } : {}),
    ...(String(brut.clientele ?? "").trim() ? { clientele: String(brut.clientele).trim() } : {}),
    ...(String(brut.gouts ?? "").trim() ? { gouts: String(brut.gouts).trim() } : {}),
    ...(Array.isArray(brut.faits) && brut.faits.length ? { faits: faitsDuFichier(brut.faits) } : {}),
  };
  if (o.sansNom) {
    if (c.nom) throw new Error(`Ce client a déjà un nom (« ${c.nom} ») : l'essai des noms ne vaut que pour un client qui n'en a pas encore. Rien n'est lancé.`);
  } else if (!c.nom) throw new Error("Nom du client manquant (CLIENT_NOM, par exemple le nom choisi à l'essai des noms, ou « nom » du fichier) : rien n'est lancé.");
  if (!c.metier) throw new Error("Métier du client manquant (CLIENT_METIER ou « metier » du fichier) : rien n'est lancé.");
  if (c.kind !== "produits" && c.kind !== "services") throw new Error("Type du client manquant ou faux (CLIENT_TYPE ou « kind » du fichier : « produits » ou « services ») : rien n'est lancé.");
  if (!c.produits.length) throw new Error("Produits ou prestations du client manquants (CLIENT_PRODUITS, séparés par « ; », ou « produits » du fichier) : rien n'est lancé.");
  return c;
}

/** La fiche du client telle que le Studio l'écrit (`ficheTexte`), à partir de ses réponses : son activité et son offre. */
export async function ficheDuClient(c: ClientDeLEssai, projectId?: string): Promise<string> {
  const { ficheTexte } = await import("../../src/lib/syna-agent/fiche");
  const at = Date.now();
  const j = {
    start: {
      business: { value: c.kind === "produits" ? "products" : "services", status: "answered", source: "client", at },
      offer: { value: `${c.metier} : ${c.produits.join(", ")}`, status: "answered", source: "client", at },
      ...reponsesFacultatives(c, at),
    },
    keep: [], steps: {},
  };
  return ficheTexte({ j: j as never, notes: [], projectId: projectId ?? null, ...(c.faits?.length ? { faits: c.faits } : {}) });
}

/** Les faits du fichier du client, vérifiés (un fait mal formé arrête tout : rien n'est lancé). */
export function faitsDuFichier(brut: unknown[]): NonNullable<ClientDeLEssai["faits"]> {
  return brut.map((x, i) => {
    const f = (x ?? {}) as Record<string, unknown>;
    const etat = String(f.etat ?? "donne");
    if (typeof f.sujet !== "string" || !f.sujet.trim() || !["donne", "ne_sait_pas", "ne_montre_pas"].includes(etat)) throw new Error(`Fait n° ${i + 1} du client illisible (« sujet » et « etat » : donne, ne_sait_pas ou ne_montre_pas) : rien n'est lancé.`);
    return {
      sujet: f.sujet.trim(), etat: etat as "donne", at: typeof f.at === "number" ? f.at : 0,
      ...(typeof f.produit === "string" && f.produit.trim() ? { produit: f.produit.trim() } : {}),
      ...(typeof f.valeur === "string" && f.valeur.trim() ? { valeur: f.valeur.trim() } : {}),
      ...(Array.isArray(f.noms) ? { noms: f.noms.map((n) => String(n).trim()).filter(Boolean) } : {}),
    };
  });
}
/** Ce que ses images et ses textes peuvent écrire (les mentions vraies), et ce qu'il ne veut pas montrer. */
export async function faitsPermisDuClient(c: Pick<ClientDeLEssai, "faits">) {
  const { faitsPermis } = await import("../../src/lib/syna-agent/faits-a-montrer");
  return faitsPermis(c.faits ?? []);
}

/** Ses réponses facultatives (prix, client idéal, image voulue), comme le Studio les garde au départ ; rien quand elles manquent. */
export function reponsesFacultatives(c: Pick<ClientDeLEssai, "prix" | "clientele" | "gouts">, at = Date.now()) {
  const r = (value: string) => ({ value, status: "answered" as const, source: "client" as const, at });
  return { ...(c.clientele ? { audience: r(c.clientele) } : {}), ...(c.gouts ? { image: r(c.gouts) } : {}), ...(c.prix ? { price: r(c.prix) } : {}) };
}

/** Le type du projet du Studio pour ce client. */
export const typeDuProjet = (c: Pick<ClientDeLEssai, "kind">) => (c.kind === "produits" ? "products" : "services") as "products" | "services";
