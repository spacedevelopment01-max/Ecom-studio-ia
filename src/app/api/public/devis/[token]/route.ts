/**
 * La page de signature d'un devis (recherche 08, point 8) : le client de l'artisan lit le devis, recopie « bon pour
 * accord », tape son nom et valide ; le Studio garde la preuve (`suivi/devis.ts`). Éteinte (404) tant que le propriétaire
 * n'a pas dit oui (réglage `suivi.devis`). Débit limité par adresse IP ; aucun cookie.
 */
import { one } from "@/lib/db";
import { clientIp, rateTake } from "@/lib/rate-limit";
import { suiviAllume } from "@/lib/suivi/reglages";
import { empreinteDevis, MENTION_ACCORD, signer, totaux, type Devis } from "@/lib/suivi/devis";

export const runtime = "nodejs";

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const euros = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;
const page = (body: string, status = 200) => new Response(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Devis</title><body style="font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5">${body}</body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

function lire(token: string): { d: Devis; signe: boolean } | null {
  try {
    const r = one<{ document: string; signe_at: number | null }>("SELECT document, signe_at FROM devis_signatures WHERE token=?", token);
    return r ? { d: JSON.parse(r.document) as Devis, signe: !!r.signe_at } : null;
  } catch { return null; }
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!suiviAllume("devis")) return page("<h1>Page introuvable.</h1>", 404);
  const x = lire(token);
  if (!x) return page("<h1>Page introuvable.</h1>", 404);
  const t = totaux(x.d.lignes);
  const lignes = x.d.lignes.map((l) => `<tr><td>${esc(l.libelle)}</td><td>${esc(l.quantite)} ${esc(l.unite)}</td><td>${euros(l.prixHT)}</td><td>${euros(l.totalHT)}</td></tr>`).join("");
  const form = x.signe ? "<p><b>Ce devis est signé.</b></p>" : `<form method="post"><input type="hidden" name="empreinte" value="${empreinteDevis(x.d)}"><p><label>Recopiez « ${MENTION_ACCORD} »<br><input name="mention" required style="width:100%;padding:.6rem"></label></p><p><label>Votre nom et prénom<br><input name="nom" required autocomplete="name" style="width:100%;padding:.6rem"></label></p><p><button type="submit" style="padding:.8rem 1.2rem">Je signe le devis</button></p><p style="font-size:.85em">Signature électronique simple : la date, l'heure et l'empreinte du devis signé sont gardées comme preuve.</p></form>`;
  return page(`<h1>Devis de ${esc(x.d.entreprise.nom)}</h1><p>${esc(x.d.date)} · ${esc(x.d.client.nom)} · ${esc(x.d.lieu)}</p><p>${esc(x.d.nature)}</p><table style="width:100%;border-collapse:collapse"><tr><th align="left">Prestation</th><th align="left">Quantité</th><th align="left">Prix HT</th><th align="left">Total HT</th></tr>${lignes}</table><p>Total HT : ${euros(t.ht)}${t.tva.map((v) => ` · TVA ${v.taux} % : ${euros(v.montant)}`).join("")} · <b>Total TTC : ${euros(t.ttc)}</b></p><p>Devis valable ${esc(x.d.validiteJours)} jours.</p>${form}`);
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!suiviAllume("devis") || !lire(token)) return page("<h1>Page introuvable.</h1>", 404);
  if (!rateTake([{ key: `devis-signe:${token}:${clientIp(req) ?? "?"}`, max: 10, windowMs: 10 * 60_000 }])) return page("<h1>Trop d'essais : réessayez dans quelques minutes.</h1>", 429);
  const f = new URLSearchParams(await req.text());
  try {
    signer(token, { nom: f.get("nom") ?? "", mention: f.get("mention") ?? "", empreinteVue: f.get("empreinte") ?? "" });
    return page("<h1>Merci, le devis est signé.</h1><p>Le professionnel est prévenu.</p>");
  } catch (e) { return page(`<h1>Signature impossible.</h1><p>${esc((e as Error).message)}</p><p><a href="">Revenir au devis</a></p>`, 400); }
}
