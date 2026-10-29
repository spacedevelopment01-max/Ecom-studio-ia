/**
 * Domaines personnalisés d'un site publié (#232), préparés mais non activés : le client relie un domaine qu'il possède,
 * prouve sa propriété par un enregistrement TXT, puis le domaine est servi seulement si `SITES_CUSTOM_DOMAINS=1`.
 * Le certificat HTTPS relève du proxy frontal (non fourni ici) ; aucun achat de domaine, aucun registrar.
 */
import { resolveTxt, resolveCname } from "node:dns/promises";
import { HttpError } from "../auth";
import { now, one, run } from "../db";
import { L } from "../i18n-server";
import { randomToken } from "../secrets";
import { normalizeHost, sitesDomain, studioHosts } from "./host-match";
import { addressOf, ensureSiteTables, studioAddress, type SiteAddress } from "./store";

export const MAX_CUSTOM_DOMAINS = 2;
/** Nom de l'enregistrement de preuve : `_ecs-verif.<domaine>`. */
export const proofName = (hostname: string) => `_ecs-verif.${hostname}`;

/** Instructions DNS à afficher au client (preuve de propriété, puis pointage vers l'adresse du site). */
export function dnsInstructions(a: SiteAddress) {
  const target = studioAddress(a.project_id)?.hostname ?? null;
  return { txt: { name: proofName(a.hostname), value: a.verify_token }, cname: target ? { name: a.hostname, value: target } : null };
}

export function addCustomDomain(projectId: string, raw: string): SiteAddress {
  ensureSiteTables();
  const hostname = normalizeHost(raw.replace(/^https?:\/\//i, "").split("/")[0]);
  const domain = sitesDomain();
  if (!hostname || !hostname.includes(".")) throw new HttpError(400, L("Nom de domaine invalide (exemple : www.mon-entreprise.fr).", "Invalid domain name (example: www.my-business.com)."), "invalid_domain");
  if (domain && (hostname === domain || hostname.endsWith(`.${domain}`))) throw new HttpError(400, L("Ce domaine appartient au studio : l'adresse de votre site s'y trouve déjà.", "This domain belongs to the studio: your site's address is already there."), "studio_domain");
  if (studioHosts().includes(hostname)) throw new HttpError(400, L("Ce domaine est celui du studio.", "This is the studio's domain."), "studio_domain");
  const existing = addressOf(hostname);
  if (existing && existing.project_id !== projectId) throw new HttpError(409, L("Ce domaine est déjà relié à un autre site. S'il vous appartient, retirez-le d'abord de cet autre site.", "This domain is already linked to another site. If it's yours, remove it from that site first."), "domain_taken");
  if (existing) return existing;
  const count = one<{ n: number }>("SELECT COUNT(*) n FROM site_addresses WHERE project_id = ? AND kind = 'custom'", projectId)!.n;
  if (count >= MAX_CUSTOM_DOMAINS) throw new HttpError(409, L(`Au plus ${MAX_CUSTOM_DOMAINS} domaines personnalisés par site.`, `At most ${MAX_CUSTOM_DOMAINS} custom domains per site.`), "domain_limit");
  run("INSERT INTO site_addresses (hostname, project_id, kind, status, verify_token, created_at) VALUES (?,?,?,?,?,?)", hostname, projectId, "custom", "pending_dns", `ecs-${randomToken(18)}`, now());
  return addressOf(hostname)!;
}

type Resolver = { txt: (name: string) => Promise<string[][]>; cname: (name: string) => Promise<string[]> };
const realDns: Resolver = { txt: resolveTxt, cname: resolveCname };

/**
 * Vérifie la preuve TXT (et signale si le CNAME ne pointe pas encore vers l'adresse du site). Le résultat est
 * enregistré tel quel (date, erreur lisible) ; seul un TXT exact rend le domaine « vérifié ».
 */
export async function verifyCustomDomain(projectId: string, hostname: string, dns: Resolver = realDns): Promise<SiteAddress> {
  ensureSiteTables();
  const a = addressOf(hostname);
  if (!a || a.project_id !== projectId || a.kind !== "custom") throw new HttpError(404, L("Domaine introuvable.", "Domain not found."));
  let error: string | null = null;
  try {
    const records = (await dns.txt(proofName(hostname))).map((r) => r.join(""));
    if (!records.includes(a.verify_token ?? "")) error = L("Enregistrement TXT de preuve introuvable ou différent.", "Proof TXT record missing or different.");
  } catch {
    error = L("Enregistrement TXT de preuve introuvable (la propagation DNS peut prendre jusqu'à 48 h).", "Proof TXT record not found (DNS propagation can take up to 48 h).");
  }
  let cnameWarning: string | null = null;
  const target = studioAddress(projectId)?.hostname;
  if (!error && target) {
    try {
      const c = await dns.cname(hostname);
      if (!c.map((x) => x.toLowerCase().replace(/\.$/, "")).includes(target)) cnameWarning = L(`Le domaine ne pointe pas encore vers ${target}.`, `The domain doesn't point to ${target} yet.`);
    } catch { cnameWarning = L(`Le domaine ne pointe pas encore vers ${target} (CNAME).`, `The domain doesn't point to ${target} yet (CNAME).`); }
  }
  run("UPDATE site_addresses SET status = ?, verified_at = CASE WHEN ? IS NULL THEN COALESCE(verified_at, ?) ELSE verified_at END, checked_at = ?, check_error = ? WHERE hostname = ?",
    error ? "pending_dns" : "verified", error, now(), now(), error ?? cnameWarning, hostname);
  return addressOf(hostname)!;
}

/** Retire un domaine personnalisé : il cesse aussitôt d'être servi (la publication du site n'est pas touchée). */
export function removeCustomDomain(projectId: string, hostname: string) {
  ensureSiteTables();
  const a = addressOf(hostname);
  if (!a || a.project_id !== projectId || a.kind !== "custom") throw new HttpError(404, L("Domaine introuvable.", "Domain not found."));
  run("DELETE FROM site_addresses WHERE hostname = ? AND project_id = ?", hostname, projectId);
}
