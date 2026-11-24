/**
 * L'essai réel des 12 esquisses de logo : la partie qui se teste (appels simulés dans les essais). Le script à lancer est
 * scripts/syna-recette/essai-esquisses.mts, qui l'utilise ; son en-tête dit tout.
 */
import fs from "node:fs";
import path from "node:path";
import type { GraphistesAi } from "../../src/lib/syna-agent/logo-graphistes";

export const CLIENT = { nom: "Racine", activite: "pépiniériste qui vend des plantes en ligne", kind: "produits" as const };
export const euros = (micro: number) => `${(micro / 1_000_000).toFixed(4).replace(".", ",")} €`;

export type ResultatDeLEssai = { arret?: string; metier?: string; texte?: string; planches: string[]; esquisses: number; refusees: string[]; manquees: string[]; depenseMicro: number };

/**
 * L'essai lui-même. `ai` : les appels (par défaut `graphistesDeps.ai`, sinon les vrais appels de SINA). Le plafond, en
 * euros, allume le garde-fou de l'essai pour toute la durée du script.
 */
export async function essaiDesEsquisses(o: { sortie: string; plafondEuros: string; ai?: (c: { userId: string; projectId: string; jobId: string; capMicro: number }) => GraphistesAi }): Promise<ResultatDeLEssai> {
  const plafond = Number(o.plafondEuros.replace(",", "."));
  if (!Number.isFinite(plafond) || plafond <= 0) throw new Error("PLAFOND_ESSAI_EUR manquant ou illisible : rien n'est lancé.");
  // 2. Le garde-fou de l'essai, compté depuis le début du script.
  process.env.STUDIO_ESSAI_PLAFOND_EUROS = String(plafond);
  const debut = Date.now();
  process.env.STUDIO_ESSAI_DEBUT = String(debut);
  fs.mkdirSync(o.sortie, { recursive: true });

  const { id, run } = await import("../../src/lib/db");
  const { account, project } = await import("../../tests/conversation209-fixtures");
  const { graphistesDeps, vraisAppels, ecrireLeMetier } = await import("../../src/lib/syna-agent/logo-graphistes");
  const { demandeDeRecherche, lancerLesPlanches } = await import("../../src/lib/syna-agent/logo-recherche");
  const { decouperLaPlanche, plancheContact } = await import("../../src/lib/syna-agent/esquisses");
  const { CostCapReached, depensesDeLaTache } = await import("../../src/lib/ai/trace");
  const { PlafondDeLEssaiAtteint, depensesDeLEssai } = await import("../../src/lib/ai/plafond-essai");
  const { runForUser } = await import("../../src/lib/ai/access");
  const { runWithLang } = await import("../../src/lib/i18n-server");

  // 1. Le client fictif et son projet.
  const u = await account();
  const projectId = project(u) as string;
  run("UPDATE projects SET name=? WHERE id=?", CLIENT.nom, projectId);
  const jobId = `essai-esquisses-${id()}`;
  const capMicro = Math.floor(plafond * 1_000_000);
  const qui = { userId: u.id, projectId, jobId, capMicro };
  const ai: GraphistesAi = o.ai ? o.ai(qui) : graphistesDeps.ai ? graphistesDeps.ai(jobId) : vraisAppels({ ...qui, studioCapMicro: capMicro });

  const res: ResultatDeLEssai = { planches: [], esquisses: 0, refusees: [], manquees: [], depenseMicro: 0 };
  const lignes: string[] = [`Essai des esquisses de logo — client « ${CLIENT.nom} » (${CLIENT.activite}), type « ${CLIENT.kind} »`, `Plafond de l'essai : ${euros(capMicro)}`, ""];
  const ecrire = () => {
    res.depenseMicro = Math.max(depensesDeLEssai(debut), depensesDeLaTache(jobId).total);
    lignes.push("", `Dépense réelle comptée par le Studio : ${euros(res.depenseMicro)}`);
    if (res.manquees.length) lignes.push("", "Planches manquées (jamais relancées) :", ...res.manquees.map((m) => `- ${m}`));
    if (res.arret) lignes.push("", `ARRÊT : ${res.arret}`);
    fs.writeFileSync(path.join(o.sortie, "rapport.txt"), `${lignes.join("\n")}\n`);
    return res;
  };
  const arret = (e: unknown) => e instanceof PlafondDeLEssaiAtteint ? `le garde-fou de l'essai a refusé un appel : ${e.message}` : null;

  return runWithLang({ ui: "fr", content: "fr" }, () => runForUser(u.id, async () => {
    // 3. Le métier, contrôle compris.
    let metier;
    try {
      const m = await ecrireLeMetier(ai, CLIENT);
      if (!m.ok) { res.arret = `le métier n'a pas passé le contrôle : ${m.raison}`; return ecrire(); }
      metier = m.metier;
    } catch (e) {
      res.arret = arret(e) ?? `le métier n'a pas pu être écrit : ${String((e as Error)?.message ?? e).slice(0, 300)}`;
      return ecrire();
    }
    res.metier = metier.metier;
    lignes.push(`Phrase du métier : ${metier.metier}`, `Ce que la piste explore : ${metier.court} (${metier.piste})`);
    // 4. La demande exacte, mot pour mot.
    const texte = demandeDeRecherche({ nom: CLIENT.nom, metier });
    res.texte = texte;
    lignes.push("", "Texte exact envoyé aux deux modèles :", texte, "");
    // 5. Les deux planches en même temps, par le chemin des images du Studio.
    const { planches, manquees } = await lancerLesPlanches(async (modele, prompt) => {
      const r = await ai.planche(modele, prompt, `r1-t1-${modele}`);
      return { png: r.png, requestId: r.recu?.requestId ?? null, usage: r.recu?.usage ?? null, coutMicro: r.recu?.coutMicro ?? null };
    }, texte, (e) => e instanceof CostCapReached);
    res.manquees = manquees.map((m) => `${m.modele} : ${m.raison}${m.plafond ? " (plafond)" : ""}`);
    // 6. La découpe gratuite ; rien ne part après.
    const gardees: { numero: number; png: Buffer }[] = [];
    for (const pl of planches) {
      const nomPlanche = `planche-${pl.modele}.png`;
      fs.writeFileSync(path.join(o.sortie, nomPlanche), pl.png);
      res.planches.push(nomPlanche);
      lignes.push(`Planche ${pl.modele} : ${nomPlanche}${pl.requestId ? ` (requête ${pl.requestId})` : ""}${pl.coutMicro != null ? `, coût lu ${euros(pl.coutMicro)}` : ""}`);
      const d = await decouperLaPlanche(pl.png);
      if (!d.ok) { res.refusees.push(`${pl.modele}, planche entière : ${d.raison}`); continue; }
      for (const c of d.cases) {
        if (!c.png) { res.refusees.push(`${pl.modele}, case ${c.index + 1} : ${c.refus ?? "case vide"}`); continue; }
        const numero = gardees.length + 1;
        gardees.push({ numero, png: c.png });
        fs.writeFileSync(path.join(o.sortie, `esquisse-${String(numero).padStart(2, "0")}.png`), c.png);
      }
    }
    res.esquisses = gardees.length;
    if (gardees.length) fs.writeFileSync(path.join(o.sortie, "planche-contact.png"), await plancheContact(gardees));
    lignes.push("", `Esquisses découpées : ${gardees.length}`, "Cases refusées par la découpe :", ...(res.refusees.length ? res.refusees.map((r) => `- ${r}`) : ["- aucune"]));
    const refusParLEssai = manquees.find((m) => m.plafond && /essai/.test(m.raison));
    if (refusParLEssai) res.arret = `le garde-fou de l'essai a refusé la planche ${refusParLEssai.modele} : ${refusParLEssai.raison}`;
    return ecrire();
  }));
}
