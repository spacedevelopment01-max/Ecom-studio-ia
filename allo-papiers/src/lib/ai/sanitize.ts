import { AnalysisSchema, ClassificationSchema, type Analysis, type Classification } from "./schema";
import { daysBetween, isIsoDate } from "../time";

/**
 * Règles de prudence appliquées par le serveur APRÈS la validation du format.
 * Elles ne font jamais confiance au modèle sur les points critiques :
 * - une date sans citation du document est retirée ;
 * - une date « calculée » sans calcul explicite est retirée ;
 * - une conséquence « écrite » sans citation est requalifiée ;
 * - une adresse sans citation est retirée ;
 * - les pages citées doivent exister.
 */
export function sanitizeAnalysis(raw: unknown, pageCount: number, today: string): Analysis {
  const a = AnalysisSchema.parse(raw);
  const validPage = (p: number) => Number.isInteger(p) && p >= 1 && p <= pageCount;
  const notes: string[] = [];

  a.passages_sources = a.passages_sources.filter((s) => validPage(s.page) && s.citation.trim().length > 0);
  a.references_utiles = a.references_utiles.filter((r) => validPage(r.page));
  a.autres_dates = a.autres_dates.filter((d) => isIsoDate(d.date) && validPage(d.source.page) && d.source.citation.trim());
  a.lisibilite.pages_illisibles = [...new Set(a.lisibilite.pages_illisibles.filter(validPage))].sort((x, y) => x - y);
  for (const an of a.anomalies) if (an.source && !validPage(an.source.page)) an.source = null;

  // ── Date limite ──
  const dl = a.date_limite;
  if (dl.source && !validPage(dl.source.page)) dl.source = null;
  if (dl.nature === "aucune" || dl.date === null) {
    dl.date = null;
    dl.nature = "aucune";
  } else if (!isIsoDate(dl.date)) {
    notes.push("Une date limite a été repérée mais n'a pas pu être lue de façon certaine : vérifiez-la dans le document.");
    Object.assign(dl, { date: null, nature: "aucune", source: null, calcul: null });
  } else if (dl.nature === "ecrite" && !dl.source?.citation.trim()) {
    notes.push("Une date limite a été repérée sans que son passage puisse être cité : elle n'est pas retenue. Vérifiez le document.");
    Object.assign(dl, { date: null, nature: "aucune", source: null, calcul: null });
  } else if (dl.nature === "calculee" && (!dl.calcul?.trim() || !dl.source?.citation.trim())) {
    notes.push("Une échéance aurait pu être calculée, mais le document ne donne pas tous les éléments nécessaires : aucune date n'est retenue.");
    Object.assign(dl, { date: null, nature: "aucune", source: null, calcul: null });
  }
  if (dl.nature === "calculee" && !dl.incertitude) {
    dl.incertitude = "Date calculée à partir du délai indiqué dans le courrier : le point de départ exact (date d'envoi ou de réception) est à confirmer.";
  }
  if (dl.nature === "aucune") dl.libelle = dl.libelle ?? null;

  // ── Urgence cohérente avec l'échéance ──
  if (dl.date) {
    const days = daysBetween(today, dl.date);
    if (days <= 7 && a.urgence.niveau !== "rouge") {
      a.urgence.niveau = "rouge";
      a.urgence.justification = days < 0
        ? `La date limite indiquée (${dl.date}) semble dépassée. ${a.urgence.justification}`
        : `La date limite indiquée arrive dans ${days} jour(s). ${a.urgence.justification}`;
    } else if (a.urgence.niveau === "vert") {
      a.urgence.niveau = "orange";
      a.urgence.justification = `Une date limite figure dans le document. ${a.urgence.justification}`;
    }
  }

  // ── Conséquences : jamais de sanction sans citation ──
  if (a.consequences.fondement === "ecrit_dans_document" && (!a.consequences.source || !validPage(a.consequences.source.page) || !a.consequences.source.citation.trim())) {
    a.consequences = {
      texte: `Le courrier ne précise pas clairement les conséquences d'une absence de réponse. ${a.consequences.texte}`.trim(),
      fondement: "non_precise_dans_document",
      source: null,
    };
  }

  // ── Adresse du destinataire : seulement si citée ──
  if (a.destinataire && (!validPage(a.destinataire.source.page) || !a.destinataire.source.citation.trim())) {
    a.destinataire = null;
    notes.push("Une adresse a été repérée sans citation vérifiable : elle n'est pas reprise.");
  }

  // ── Lisibilité ──
  if (a.lisibilite.globale === "insuffisante") {
    a.incertitudes.unshift("Le document est difficile à lire : reprenez une photo plus nette pour une analyse fiable.");
  }
  if (a.lisibilite.pages_illisibles.length > 0) {
    a.informations_manquantes.unshift(`Page(s) difficile(s) à lire : ${a.lisibilite.pages_illisibles.join(", ")}.`);
  }

  // ── Pièces demandées et classement : jamais de date inventée ──
  for (const pd of a.pieces_demandees) if (pd.source && (!validPage(pd.source.page) || !pd.source.citation.trim())) pd.source = null;
  a.classement = sanitizeClassification(a.classement);

  a.incertitudes.push(...notes);
  a.etapes = a.etapes.slice(0, 8);
  return a;
}

/** Le classement ne garde que des dates valides ; une date de validité absente reste absente. */
export function sanitizeClassification(raw: unknown): Classification {
  const c = ClassificationSchema.parse(raw);
  if (c.date_document && !isIsoDate(c.date_document)) c.date_document = null;
  if (c.valable_jusqu_au && !isIsoDate(c.valable_jusqu_au)) c.valable_jusqu_au = null;
  c.libelle = c.libelle.trim().slice(0, 120) || "Document";
  if (c.periode) c.periode = c.periode.trim().slice(0, 40) || null;
  if (c.emetteur) c.emetteur = c.emetteur.trim().slice(0, 120) || null;
  return c;
}
