/**
 * Décision du chef d'orchestre du 26 novembre 2026 : « Le client ne doit jamais voir un identifiant de modèle, un texte
 * technique ou une consigne qu'il ne peut pas suivre. » Une tâche qui tombe sur une erreur au résultat incertain donne au
 * client la phrase de SINA ; le détail (fournisseur, modèle, cause, résultat incertain) reste au journal du Studio. Aucun
 * appel à l'IA.
 */
import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { all, id, now, one, run } from "@/lib/db";
import { claimNext, enqueue, failJob, getJob, publicJob } from "@/lib/jobs";
import { uncertainMediaError } from "@/lib/ai/media-providers";
import { causePourLeClient, erreurTechniqueDeLIA, phraseDeSinaApresUnePanne, pourLeClient } from "@/lib/ai/phrase-pour-le-client";
import { runWithLang } from "@/lib/i18n-server";

const user = async () => createUser(`pc${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "T");
const TECHNIQUE = /gpt-image|sunburst|openai|fournisseur|provider|Connection error|fetch failed|incertain|uncertain|Vérifiez|consommation|coût maximal|réservation/i;
const PHRASE_UNE = "J'ai gardé tout ce qui est fait. Une image n'a pas pu être créée, à cause d'un problème de connexion : je peux la refaire quand tu veux.";

function coupure() {
  const reseau = Object.assign(new Error("other side closed"), { code: "UND_ERR_SOCKET" });
  const sdk = Object.assign(new Error("Connection error."), { name: "APIConnectionError", cause: Object.assign(new Error("fetch failed"), { cause: reseau }) });
  return uncertainMediaError(sdk, { provider: "openai", model: "gpt-image-2.5-sunburst", task: "image_generation" });
}

describe("une erreur au résultat incertain : le client lit la phrase de SINA, le Studio garde le détail", () => {
  it("la tâche en échec, son suivi et sa notification ne portent que la phrase de SINA ; le détail va au journal", async () => {
    const u = await user();
    const type = `test.phrase.${Math.random().toString(36).slice(2, 7)}`;
    const j = enqueue({ userId: u.id, type, label: "Planche en vrai", payload: {} });
    claimNext([type]);
    failJob(getJob(j.id)!, coupure());
    const apres = getJob(j.id)!;
    expect(apres.status).toBe("failed");
    expect(apres.message).toBe(PHRASE_UNE);
    expect(publicJob(apres).error).toBe(PHRASE_UNE);
    const notes = all<{ title: string; body: string }>("SELECT title, body FROM notifications WHERE user_id = ?", u.id);
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toBe(PHRASE_UNE);
    for (const t of [apres.message, publicJob(apres).error, notes[0].title, notes[0].body]) expect(String(t)).not.toMatch(TECHNIQUE);
    // Le détail reste au Studio : colonne de la tâche (page d'administration) et journal des erreurs, avec la cause du réseau.
    expect(apres.error).toMatch(/Résultat incertain chez openai:gpt-image-2\.5-sunburst \(Connection error\.\)/);
    expect(apres.error).toMatch(/other side closed \[UND_ERR_SOCKET\]/);
    const journal = one<{ scope: string; message: string }>("SELECT scope, message FROM error_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 1", u.id);
    expect(journal?.scope).toBe(`tache:${type}`);
    expect(journal?.message).toMatch(/openai:gpt-image-2\.5-sunburst/);
  });

  it("plusieurs images touchées dans la même tentative : la phrase le dit au pluriel", async () => {
    const u = await user();
    const type = `test.phrase.${Math.random().toString(36).slice(2, 7)}`;
    const j = enqueue({ userId: u.id, type, payload: {} });
    claimNext([type]);
    for (let i = 0; i < 3; i++) run("INSERT INTO ai_reservations (id, user_id, amount, status, task, provider, model, job_id, created_at, settled_at) VALUES (?,?,?,?,?,?,?,?,?,?)", id(), u.id, 1000, "uncertain", "image_generation", "openai", "gpt-image-2.5-sunburst", j.id, now(), now());
    failJob(getJob(j.id)!, coupure());
    expect(getJob(j.id)!.message).toBe("J'ai gardé tout ce qui est fait. 3 images n'ont pas pu être créées, à cause d'un problème de connexion : je peux les refaire quand tu veux.");
  });

  it("une coupure sans résultat incertain (rien de payé) : la nouvelle tentative ne montre pas le texte du réseau", async () => {
    const u = await user();
    const type = `test.phrase.${Math.random().toString(36).slice(2, 7)}`;
    const j = enqueue({ userId: u.id, type, payload: {}, maxAttempts: 3 });
    claimNext([type]);
    failJob(getJob(j.id)!, Object.assign(new Error("Connection error."), { name: "APIConnectionError" }));
    const apres = getJob(j.id)!;
    expect(apres.status).toBe("queued");
    expect(apres.message).toMatch(/^Nouvelle tentative dans \d+ s, après un problème de connexion\.$/);
    expect(apres.error).toBe("Connection error.");
  });

  it("une autre erreur garde son message (rien n'est caché qui n'est pas technique)", async () => {
    const u = await user();
    const type = `test.phrase.${Math.random().toString(36).slice(2, 7)}`;
    const j = enqueue({ userId: u.id, type, payload: {}, maxAttempts: 1 });
    claimNext([type]);
    failJob(getJob(j.id)!, new Error("Ajoute d'abord une photo de ton produit."), { permanent: true });
    expect(getJob(j.id)!.message).toBe("Ajoute d'abord une photo de ton produit.");
    expect(erreurTechniqueDeLIA(new Error("Ajoute d'abord une photo de ton produit."))).toBeNull();
  });

  it("la phrase en anglais, pour une vidéo, pour une étape de texte, et la cause glissée dans une phrase", () => {
    expect(runWithLang({ ui: "en" }, () => pourLeClient(coupure()))).toBe("I kept everything that's done. One image couldn't be created because of a connection problem: I can redo it whenever you like.");
    expect(phraseDeSinaApresUnePanne({ nature: "video", reseau: true }, 2)).toBe("J'ai gardé tout ce qui est fait. 2 vidéos n'ont pas pu être créées, à cause d'un problème de connexion : je peux les refaire quand tu veux.");
    const texte = Object.assign(new Error("Résultat incertain chez Anthropic (HTTP 529) : coût maximal retenu par prudence, aucune relance automatique. Vérifiez la consommation chez le fournisseur avant de recommencer."), { uncertain: true, nature: "texte" });
    expect(pourLeClient(texte)).toBe("J'ai gardé tout ce qui est fait. Une étape n'a pas pu se terminer, à cause d'un problème passager : je peux la reprendre quand tu veux.");
    expect(`Photo non créée : ${causePourLeClient(coupure())}.`).toBe("Photo non créée : un problème de connexion.");
    // Un texte déjà enregistré (colonne de la tâche) est reconnu aussi.
    expect(erreurTechniqueDeLIA("Résultat incertain chez openai:gpt-image-2.5-sunburst (Connection error.) : coût maximal retenu")).toEqual({ nature: "image", reseau: true });
  });
});
