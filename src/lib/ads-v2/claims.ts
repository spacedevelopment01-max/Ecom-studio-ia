/**
 * Contrôle des affirmations commerciales (Ads V2), avant tout visuel et avant toute dépense d'image :
 *  - affirmation non confirmée (chiffre, durée, garantie…) : reprise des contrôles du studio (`lintClaims`) ;
 *  - superlatifs invérifiables (« le meilleur », « n°1 », « révolutionnaire ») ;
 *  - allégations de santé ou d'efficacité médicale ;
 *  - fausse urgence (« stock limité », « derniers jours ») et promotion non configurée ;
 *  - avis, notes et témoignages absents des preuves disponibles ;
 *  - allégations que le client a demandé d'éviter ;
 *  - règles des régies (attributs personnels, majuscules, ponctuation répétée, longueurs) : `adPolicyIssues`.
 * Chaque défaut a un code (barrière de qualité) et une consigne de correction.
 */
import type { Project } from "../projects";
import { lintClaims, lintHollow } from "../ai/tasks";
import { adPolicyIssues } from "../engine/ad-craft";
import type { AdCopy, AdInsight } from "./types";

export type ClaimIssue = { code: "unverified_claim" | "forbidden_claim" | "fake_urgency" | "invented_offer" | "fake_social_proof" | "avoided_claim" | "policy" | "hollow" | "length"; field: string; term: string; fix: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const SUPERLATIVE = /\b(le meilleur|la meilleure|les meilleur(e)?s|meilleur du marche|n[°o] ?1|numero 1|leader|revolutionnaire|unique au monde|miracle|parfait pour tous|the best|best[- ]in[- ]class|#1|number one|revolutionary|world'?s first|miracle)\b/;
const HEALTH = /\b(guerit|soigne|traite (l|la|le|les)|anti[- ]age prouve|cliniquement prouve|medicalement|elimine (la|les) (douleur|maladie)|heals?|cures?|clinically proven|medically proven|treats? (acne|pain|disease))\b/;
const URGENCY = /\b(stock limite|derniers? jours?|derniere chance|plus que \d+|bientot epuise|offre limitee|limited stock|last chance|only \d+ left|selling out|ends tonight)\b/;
const PROMO = /(-\s?\d+ ?%|\d+ ?% de remise|\bpromo(tion)?s?\b|\bsoldes?\b|\breduction\b|\bremise\b|\bgratuit(e|s)?\b|\bfree shipping\b|\bdiscount\b|\b\d+ ?% off\b|\boffert(e|s)?\b)/;
const SOCIAL = /(\bavis\b|\betoiles?\b|★|\bclients? satisfaits?\b|\bnote de \d|\bplebiscite|\breviews?\b|\bstars?\b|\brated\b|\bcustomers love\b|\btestimonials?\b)/;

export function claimIssues(copies: { id: string; copy: AdCopy }[], p: Project, i: AdInsight, limits: { hookWords: number; primaryFirstLine: number; headline: number; description: number }): Map<string, ClaimIssue[]> {
  const out = new Map<string, ClaimIssue[]>();
  const proofText = norm([...i.proofs, ...i.facts.map((f) => `${f.label} ${f.value}`)].join(" "));
  const offerText = norm(i.offer ?? "");
  for (const { id, copy } of copies) {
    const list: ClaimIssue[] = [];
    const fields: [string, string][] = [["hook", copy.hook], ["primary", copy.primary], ["headline", copy.headline], ["description", copy.description], ...(copy.hookB ? ([["hookB", copy.hookB]] as [string, string][]) : [])];
    for (const c of lintClaims({ hook: copy.hook, primary: copy.primary, headline: copy.headline, description: copy.description }, p)) list.push({ code: "unverified_claim", field: c.path, term: c.term, fix: `« ${c.term} » (${c.label}) n'est pas confirmé : retire-le ou remplace-le par un fait confirmé` });
    for (const h of lintHollow({ hook: copy.hook, primary: copy.primary, headline: copy.headline })) list.push({ code: "hollow", field: h.path, term: h.term, fix: `formule creuse « ${h.term} » : remplace-la par un détail concret` });
    for (const [field, text] of fields) {
      const t = norm(text);
      const sup = t.match(SUPERLATIVE)?.[0];
      if (sup && !proofText.includes(sup)) list.push({ code: "unverified_claim", field, term: sup, fix: `superlatif invérifiable « ${sup} » : décris un fait précis à la place` });
      const health = t.match(HEALTH)?.[0];
      if (health) list.push({ code: "forbidden_claim", field, term: health, fix: `allégation de santé « ${health} » interdite : retire-la` });
      const urg = t.match(URGENCY)?.[0];
      if (urg && !offerText.includes(urg)) list.push({ code: "fake_urgency", field, term: urg, fix: `urgence non fondée « ${urg} » : retire-la` });
      const promo = t.match(PROMO)?.[0];
      // Une promotion n'est permise que si le client a configuré une offre réelle pour la campagne.
      if (promo && !offerText) list.push({ code: "invented_offer", field, term: promo.trim(), fix: `promotion « ${promo.trim()} » non configurée par le client : retire-la` });
      const social = t.match(SOCIAL)?.[0];
      if (social && !norm(i.proofs.join(" ")).includes(social.trim())) list.push({ code: "fake_social_proof", field, term: social.trim(), fix: `avis ou note (« ${social.trim()} ») absents des preuves disponibles : retire-les` });
      for (const avoid of i.claimsToAvoid) if (avoid.trim() && t.includes(norm(avoid))) list.push({ code: "avoided_claim", field, term: avoid, fix: `« ${avoid} » fait partie des allégations à éviter : retire-la` });
    }
    // Règles des régies et longueurs (contrôles déjà éprouvés du studio, plus les limites des plateformes choisies).
    for (const m of adPolicyIssues([{ hook: copy.hook, primary: copy.primary, headline: copy.headline, description: copy.description, cta: copy.cta }], p)) list.push({ code: /attribut personnel|personal attribute/i.test(m) ? "forbidden_claim" : "policy", field: "copy", term: "", fix: m.replace(/^(Annonce|Ad) 1\s*:\s*/, "") });
    const words = copy.hook.trim().split(/\s+/).filter(Boolean).length;
    if (words > limits.hookWords) list.push({ code: "length", field: "hook", term: "", fix: `accroche de ${words} mots : ${limits.hookWords} au plus` });
    const first = copy.primary.split(/\n/)[0] ?? "";
    if (first.length > limits.primaryFirstLine) list.push({ code: "length", field: "primary", term: "", fix: `première ligne de ${first.length} caractères : ${limits.primaryFirstLine} au plus` });
    if (copy.headline.length > limits.headline) list.push({ code: "length", field: "headline", term: "", fix: `titre de ${copy.headline.length} caractères : ${limits.headline} au plus` });
    if (copy.description.length > limits.description) list.push({ code: "length", field: "description", term: "", fix: `description de ${copy.description.length} caractères : ${limits.description} au plus` });
    out.set(id, dedupe(list));
  }
  // Deux concepts avec la même accroche ne testent rien.
  const seen = new Map<string, string>();
  for (const { id, copy } of copies) {
    const k = norm(copy.hook).replace(/[^a-z0-9]+/g, " ").trim().split(" ").slice(0, 5).join(" ");
    if (k && seen.has(k)) out.get(id)!.push({ code: "policy", field: "hook", term: copy.hook, fix: "même accroche qu'une autre annonce : chaque annonce teste un levier différent" });
    else seen.set(k, id);
  }
  return out;
}

function dedupe(list: ClaimIssue[]): ClaimIssue[] {
  const seen = new Set<string>();
  return list.filter((x) => {
    const k = `${x.code}|${x.field}|${x.term}|${x.fix}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Codes de la barrière publicitaire : interdit = fatal ; le reste bloque tant qu'il n'est pas corrigé. */
export const claimCodes = (issues: ClaimIssue[]) => [...new Set(issues.map((x) => (x.code === "forbidden_claim" ? "forbidden_claim" : x.code === "length" || x.code === "policy" || x.code === "hollow" ? "copy_policy" : "unverified_claim")))];
