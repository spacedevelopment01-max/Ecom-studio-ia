/**
 * LES MODÈLES PRÊTS EN IMAGES (rapport 10, point 9) : des publications de fête, l'offre du moment, la nouveauté, en un
 * clic qui remplit la demande (le client la voit et peut la changer, mode « Ensemble »). SINA en épingle trois selon le
 * moment de l'année : les fêtes qui arrivent dans les trois semaines (engagement « les grands moments » : elle prépare
 * trois semaines avant), puis la saison, puis la nouveauté.
 *
 * Garde-fous : « L'offre du moment » ne se remplit qu'avec une offre que le client écrit lui-même (aucune urgence
 * inventée), et n'est épinglée que quand il en a une ;
 * aucune personne dans aucun modèle. Les vignettes d'exemple seront faites par l'atelier lui-même, sur des produits
 * inventés très différents (jamais un projet d'essai passé) : cela demande un petit essai payant, pas encore accordé ;
 * en attendant, la carte du modèle montre son nom et son idée, sans image d'exemple. Module pur.
 */
import type { T2 } from "./outils";

export type ModeleImage = {
  id: string;
  nom: T2;
  /** L'idée de la scène, qui remplit la demande (le décor). */
  idee: T2;
  /** Fête datée : renvoie sa date pour une année donnée (mois de 0 à 11). */
  date?: (annee: number) => Date;
  /** Saison : mois concernés (0 à 11). */
  mois?: number[];
  /** Ne se remplit qu'avec une offre écrite par le client. */
  offre?: boolean;
  format: "4:5" | "1:1" | "9:16";
};

/** Dimanche de Pâques (calcul grégorien anonyme). */
export function paques(annee: number): Date {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(annee, mois - 1, jour));
}
const dernierDimanche = (annee: number, mois: number) => { const d = new Date(Date.UTC(annee, mois + 1, 0)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d; };
const nemeDimanche = (annee: number, mois: number, n: number) => { const d = new Date(Date.UTC(annee, mois, 1)); d.setUTCDate(1 + ((7 - d.getUTCDay()) % 7) + 7 * (n - 1)); return d; };
/** Fête des mères en France : dernier dimanche de mai, ou premier de juin si c'est la Pentecôte. */
export function feteDesMeres(annee: number): Date {
  const d = dernierDimanche(annee, 4);
  const pentecote = new Date(paques(annee).getTime() + 49 * 86400_000);
  return d.getTime() === pentecote.getTime() ? nemeDimanche(annee, 5, 1) : d;
}

export const MODELES_IMAGES: ModeleImage[] = [
  { id: "saint-valentin", nom: ["La Saint-Valentin", "Valentine's Day"], idee: ["un cadeau prêt à offrir, lumière douce du soir, quelques pétales rouges", "a gift ready to give, soft evening light, a few red petals"], date: (a) => new Date(Date.UTC(a, 1, 14)), format: "4:5" },
  { id: "fete-des-meres", nom: ["La fête des mères", "Mother's Day"], idee: ["un matin tendre, une table de petit-déjeuner, des fleurs fraîches", "a tender morning, a breakfast table, fresh flowers"], date: feteDesMeres, format: "4:5" },
  { id: "fete-des-peres", nom: ["La fête des pères", "Father's Day"], idee: ["un atelier ou une table de bois, lumière chaude de fin de journée", "a workshop or wooden table, warm late-day light"], date: (a) => nemeDimanche(a, 5, 3), format: "4:5" },
  { id: "rentree", nom: ["La rentrée", "Back to school"], idee: ["un bureau rangé, la lumière claire de septembre", "a tidy desk, clear September light"], date: (a) => new Date(Date.UTC(a, 8, 1)), format: "4:5" },
  { id: "halloween", nom: ["Halloween", "Halloween"], idee: ["une table d'automne, des courges, une lueur orangée", "an autumn table, squashes, an orange glow"], date: (a) => new Date(Date.UTC(a, 9, 31)), format: "1:1" },
  { id: "noel", nom: ["Noël", "Christmas"], idee: ["un cadeau sous le sapin, papier kraft et ruban, lumières dorées", "a gift under the tree, kraft paper and ribbon, golden lights"], date: (a) => new Date(Date.UTC(a, 11, 25)), format: "4:5" },
  { id: "printemps", nom: ["Le printemps", "Spring"], idee: ["une lumière fraîche du matin, des branches en fleurs", "fresh morning light, blossoming branches"], mois: [2, 3, 4], format: "4:5" },
  { id: "ete", nom: ["L'été", "Summer"], idee: ["le plein soleil, une terrasse, des ombres nettes", "full sun, a terrace, crisp shadows"], mois: [5, 6, 7], format: "4:5" },
  { id: "automne", nom: ["L'automne", "Autumn"], idee: ["des feuilles rousses, une lumière basse et dorée", "russet leaves, low golden light"], mois: [8, 9, 10], format: "4:5" },
  { id: "hiver", nom: ["L'hiver", "Winter"], idee: ["un intérieur chaud, une couverture de laine, la lumière d'une lampe", "a warm interior, a wool blanket, lamplight"], mois: [11, 0, 1], format: "4:5" },
  { id: "offre", nom: ["L'offre du moment", "The current offer"], idee: ["ton produit en grand sur un fond calme, une place libre pour ton offre", "your product large on a calm background, free space for your offer"], offre: true, format: "4:5" },
  { id: "nouveaute", nom: ["La nouveauté", "New arrival"], idee: ["ton produit seul, présenté comme une première fois, lumière de studio", "your product alone, presented like a first time, studio light"], format: "4:5" },
];

/** Jours avant la fête où SINA la propose (« trois semaines avant »). */
export const AVANCE_JOURS = 21;

export type ModeleEpingle = ModeleImage & { epingle: boolean; dansJours: number | null };

/**
 * Les modèles proposés à cette date, les trois épinglés par SINA d'abord : les fêtes qui arrivent dans les trois
 * semaines (les plus proches d'abord), puis la saison en cours, puis la nouveauté, puis la prochaine fête. « L'offre du moment » n'est épinglée
 * (en premier) qu'avec une offre saisie ; sans elle, elle reste dans la liste et demande l'offre avant de se remplir.
 */
export function modelesPour(date: Date, o: { offreSaisie: boolean }): ModeleEpingle[] {
  const jour = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dans = (m: ModeleImage): number | null => {
    if (!m.date) return null;
    for (const a of [date.getUTCFullYear(), date.getUTCFullYear() + 1]) {
      const n = Math.round((m.date(a).getTime() - jour) / 86400_000);
      if (n >= 0) return n;
    }
    return null;
  };
  const liste = MODELES_IMAGES.map((m) => ({ ...m, epingle: false, dansJours: dans(m) }));
  const fetes = liste.filter((m) => m.dansJours != null && m.dansJours <= AVANCE_JOURS).sort((a, b) => a.dansJours! - b.dansJours!);
  const saison = liste.filter((m) => m.mois?.includes(date.getUTCMonth()));
  const offre = o.offreSaisie ? liste.filter((m) => m.offre) : [];
  const nouveaute = liste.filter((m) => m.id === "nouveaute");
  const epingles: string[] = [];
  // Toujours trois : à défaut, la prochaine fête de l'année, même au-delà des trois semaines.
  const prochaines = liste.filter((m) => m.dansJours != null).sort((a, b) => a.dansJours! - b.dansJours!);
  for (const m of [...offre, ...fetes, ...saison, ...nouveaute, ...prochaines]) if (epingles.length < 3 && !epingles.includes(m.id)) epingles.push(m.id);
  for (const m of liste) m.epingle = epingles.includes(m.id);
  return [...epingles.map((id) => liste.find((m) => m.id === id)!), ...liste.filter((m) => !m.epingle)];
}
