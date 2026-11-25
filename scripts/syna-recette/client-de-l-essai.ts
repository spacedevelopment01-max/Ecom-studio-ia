/**
 * LE CLIENT INVENTÉ D'UN ESSAI RÉEL, commun aux quatre scripts d'essai (esquisses, finalisation, planches, planche en
 * vrai) et à l'écran de la planche en vrai. Aucun client n'est imposé : le client se donne par un fichier JSON
 * (CLIENT_JSON, par exemple scripts/syna-recette/clients/ecume.json) ou par les variables CLIENT_NOM, CLIENT_METIER,
 * CLIENT_TYPE (« produits » ou « services »), CLIENT_PRODUITS (séparés par « ; ») et CLIENT_DESCRIPTEUR. Une variable
 * donnée l'emporte sur le fichier. Rien d'incomplet n'est lancé : ce qui manque est dit, et rien ne part.
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
};

/** Le client de l'essai, sans aucune valeur par défaut. */
export function clientDeLEssai(env: Record<string, string | undefined> = process.env): ClientDeLEssai {
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
  };
  if (!c.nom) throw new Error("Nom du client manquant (CLIENT_NOM ou « nom » du fichier) : rien n'est lancé.");
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
    },
    keep: [], steps: {},
  };
  return ficheTexte({ j: j as never, notes: [], projectId: projectId ?? null });
}

/** Le type du projet du Studio pour ce client. */
export const typeDuProjet = (c: Pick<ClientDeLEssai, "kind">) => (c.kind === "produits" ? "products" : "services") as "products" | "services";
