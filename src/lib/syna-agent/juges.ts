/**
 * LE CARNET DES JUGES (22 novembre 2026). Le relecteur de SINA garde ou refuse chaque image avant qu'elle soit montrée ;
 * le propriétaire dit à son tour oui ou non sur chacune (celles que SINA refuse comprises : « lui montrer les images tout
 * de suite, y compris celles que SINA refuse »). L'accord entre les deux se mesure : sur les images que le propriétaire a
 * jugées, la part où le relecteur a dit la même chose que lui.
 *
 * Le carnet ne change rien à ce que le relecteur garde : sa règle (« seule une note de 8 ou plus est montrée ») reste
 * celle que le propriétaire a validée, scellée au banc d'épreuves. Tant que l'accord n'est pas mesuré, on ne sait pas
 * si elle écarte trop ou trop peu : c'est ce que le carnet sert à savoir.
 */
import { all, now, one, run } from "../db";
import { L } from "../i18n-server";

/** Il faut au moins ce nombre d'images jugées par le propriétaire pour dire que l'accord est mesuré. */
export const ACCORD_MIN = 20;

/** Note le verdict du relecteur sur une image (gardée et montrée, ou refusée, avec sa raison). */
export function noterRelecture(o: { assetId: string; userId: string; projectId: string | null; travail: string; garde: boolean; raison?: string }): void {
  run(
    `INSERT INTO verdicts_images(asset_id,user_id,project_id,travail,relecteur_garde,relecteur_raison,created_at) VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(asset_id) DO UPDATE SET relecteur_garde=excluded.relecteur_garde, relecteur_raison=excluded.relecteur_raison`,
    o.assetId, o.userId, o.projectId, o.travail, o.garde ? 1 : 0, (o.raison ?? "").slice(0, 300), now(),
  );
}

/** Le verdict du propriétaire sur une image : oui (elle est au niveau) ou non. */
export function verdictDuProprietaire(assetId: string, verdict: "oui" | "non"): boolean {
  return !!one<{ asset_id: string }>("UPDATE verdicts_images SET proprietaire=?, proprietaire_at=? WHERE asset_id=? RETURNING asset_id", verdict, now(), assetId);
}

export type ImageAJuger = { assetId: string; travail: string; garde: boolean; raison: string; proprietaire: "oui" | "non" | null; at: number };

/** Les images du carnet, les plus récentes d'abord (celles qu'il n'a pas encore jugées en premier). */
export function carnet(limit = 60): ImageAJuger[] {
  return all<{ asset_id: string; travail: string; relecteur_garde: number; relecteur_raison: string; proprietaire: "oui" | "non" | null; created_at: number }>(
    "SELECT v.asset_id, v.travail, v.relecteur_garde, v.relecteur_raison, v.proprietaire, v.created_at FROM verdicts_images v JOIN assets a ON a.id=v.asset_id WHERE a.deleted_at IS NULL ORDER BY (v.proprietaire IS NOT NULL), v.created_at DESC LIMIT ?", limit,
  ).map((r) => ({ assetId: r.asset_id, travail: r.travail, garde: !!r.relecteur_garde, raison: r.relecteur_raison, proprietaire: r.proprietaire, at: r.created_at }));
}

export type Accord = {
  jugees: number; accords: number; part: number | null; mesure: boolean;
  /** Le relecteur a gardé ce que le propriétaire refuse (laissé passer) ; il a refusé ce que le propriétaire aime (trop sévère). */
  laissePasser: number; tropSevere: number;
  parTravail: { travail: string; jugees: number; part: number | null }[];
};

/** L'accord entre le relecteur et le propriétaire, sur les images qu'il a jugées. */
export function accord(): Accord {
  const rows = all<{ travail: string; relecteur_garde: number; proprietaire: "oui" | "non" }>("SELECT travail, relecteur_garde, proprietaire FROM verdicts_images WHERE proprietaire IS NOT NULL");
  const meme = (r: (typeof rows)[number]) => (r.relecteur_garde === 1) === (r.proprietaire === "oui");
  const by = new Map<string, { n: number; ok: number }>();
  for (const r of rows) { const x = by.get(r.travail) ?? { n: 0, ok: 0 }; x.n++; if (meme(r)) x.ok++; by.set(r.travail, x); }
  const accords = rows.filter(meme).length;
  return {
    jugees: rows.length, accords, part: rows.length ? Math.round((accords / rows.length) * 1000) / 1000 : null, mesure: rows.length >= ACCORD_MIN,
    laissePasser: rows.filter((r) => r.relecteur_garde === 1 && r.proprietaire === "non").length,
    tropSevere: rows.filter((r) => r.relecteur_garde === 0 && r.proprietaire === "oui").length,
    parTravail: [...by.entries()].map(([travail, x]) => ({ travail, jugees: x.n, part: Math.round((x.ok / x.n) * 1000) / 1000 })),
  };
}

export const travailDeLImage = (slot: string) => ({
  logo: L("le logo", "the logo"), hero: L("la grande scène", "the hero scene"), object: L("l'objet de la marque", "the brand object"),
  signs: L("les signes de la marque", "the brand signs"), site: L("le haut du site", "the top of the site"),
} as Record<string, string>)[slot] ?? (slot.startsWith("post") ? L("une publication de la planche", "a board post") : slot);
