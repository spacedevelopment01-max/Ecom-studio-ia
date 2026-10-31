/**
 * Domaine déjà possédé par le client, relié à son site publié (#232, lot C). Aucun achat, aucun registrar, aucune
 * modification de DNS par le studio : le client ajoute lui-même deux enregistrements chez son fournisseur.
 *
 * 1. Preuve de propriété : TXT `_ecs-verif.<domaine>` = jeton propre à ce site (et à ce domaine).
 * 2. Pointage : CNAME vers l'adresse du site (sous-domaine, ex. www) ou A/AAAA vers le serveur (domaine nu).
 * 3. HTTPS : certificat émis par le proxy frontal à la première visite, seulement si `ask` répond oui (voir askDomain).
 *
 * Servi seulement si : preuve vérifiée par le propriétaire ACTUEL du projet, domaine non désactivé ni perdu,
 * `SITES_CUSTOM_DOMAINS=1`. Revérifié chaque jour : preuve absente 3 fois de suite → « perdu » (domaine expiré, DNS
 * changé), plus servi, et c'est dit. Une demande non prouvée ne bloque pas le domaine plus de 7 jours (pas de squat).
 */
import { Resolver as DnsResolver } from "node:dns/promises";
import crypto from "node:crypto";
import { HttpError } from "../auth";
import { all, logError, now, one, run } from "../db";
import { L } from "../i18n-server";
import { projectPlan } from "../project-billing";
import { randomToken } from "../secrets";
import { customDomainsEnabled, normalizeHost, sitesDomain, studioHosts } from "./host-match";
import { addressOf, ensureSiteTables, livePublication, studioAddress, type SiteAddress } from "./store";

export const MAX_CUSTOM_DOMAINS = 2;
/** Une demande jamais prouvée cède la place à une autre au bout de ce délai. */
export const PENDING_CLAIM_MS = 7 * 24 * 3600_000;
/** Revérification d'un domaine relié. */
export const RECHECK_MS = 24 * 3600_000;
/** Échecs consécutifs de la preuve avant « perdu ». */
export const LOST_AFTER = 3;
/** Nom de l'enregistrement de preuve : `_ecs-verif.<domaine>`. */
export const proofName = (hostname: string) => `_ecs-verif.${hostname}`;

let ready = false;
function ensureDomainColumns() {
  ensureSiteTables();
  if (ready) return;
  const cols = new Set(all<{ name: string }>("PRAGMA table_info(site_addresses)").map((c) => c.name));
  for (const [c, t] of [["routing_ok", "INTEGER"], ["verified_by", "TEXT"], ["fail_count", "INTEGER NOT NULL DEFAULT 0"], ["disabled_at", "INTEGER"], ["last_ok_at", "INTEGER"]] as const) if (!cols.has(c)) run(`ALTER TABLE site_addresses ADD COLUMN ${c} ${t}`);
  ready = true;
}
export type CustomDomain = SiteAddress & { routing_ok: number | null; verified_by: string | null; fail_count: number; disabled_at: number | null; last_ok_at: number | null };
const customOf = (hostname: string) => { ensureDomainColumns(); return one<CustomDomain>("SELECT * FROM site_addresses WHERE hostname = ? AND kind = 'custom'", hostname); };
const ownerOf = (projectId: string) => one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", projectId)?.user_id ?? null;

/** Domaine nu (« mon-entreprise.fr ») ou sous-domaine (« www.mon-entreprise.fr ») : approximation sans liste publique. */
const SECOND_LEVEL = new Set(["co.uk", "org.uk", "com.au", "co.nz", "com.br", "co.jp", "asso.fr", "gouv.fr", "com.fr"]);
export function isApex(hostname: string) {
  const parts = hostname.split(".");
  return parts.length === 2 || (parts.length === 3 && SECOND_LEVEL.has(parts.slice(1).join(".")));
}
/** Adresses IP publiques du serveur des sites (pour un domaine nu), communiquées à la mise en service. */
export const serverIps = () => (process.env.SITES_PUBLIC_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export type DomainState = "pending_dns" | "pointing" | "active" | "not_served" | "disabled" | "reverify" | "lost";
/** État lisible d'un domaine relié (ce que voit le client). */
export function domainState(d: CustomDomain): DomainState {
  if (d.status === "lost") return "lost";
  if (d.status === "disabled") return "disabled";
  if (d.status !== "verified") return "pending_dns";
  if (d.verified_by !== ownerOf(d.project_id)) return "reverify";
  if (!d.routing_ok) return "pointing";
  return customDomainsEnabled() ? "active" : "not_served";
}

/** Instructions DNS à afficher au client : preuve, puis pointage adapté (CNAME ou A/AAAA). */
export function dnsInstructions(a: SiteAddress) {
  const target = studioAddress(a.project_id)?.hostname ?? null;
  const apex = isApex(a.hostname);
  const ips = serverIps();
  return {
    txt: { name: proofName(a.hostname), value: a.verify_token },
    apex,
    pointing: apex
      ? { type: "A/AAAA" as const, name: a.hostname, values: ips, note: ips.length ? null : L("Adresse IP du serveur communiquée à la mise en service de l'hébergement ; en attendant, reliez plutôt www.", "The server's IP address will be given when hosting goes live; meanwhile, connect www instead.") }
      : { type: "CNAME" as const, name: a.hostname, values: target ? [target] : [], note: null },
    // Compatibilité avec l'écran du prototype.
    cname: !apex && target ? { name: a.hostname, value: target } : null,
  };
}

export function addCustomDomain(projectId: string, raw: string): SiteAddress {
  ensureDomainColumns();
  const hostname = normalizeHost(raw.replace(/^https?:\/\//i, "").split("/")[0]);
  const domain = sitesDomain();
  if (!hostname || !hostname.includes(".")) throw new HttpError(400, L("Nom de domaine invalide (exemple : www.mon-entreprise.fr).", "Invalid domain name (example: www.my-business.com)."), "invalid_domain");
  if (domain && (hostname === domain || hostname.endsWith(`.${domain}`))) throw new HttpError(400, L("Ce domaine appartient au studio : l'adresse de votre site s'y trouve déjà.", "This domain belongs to the studio: your site's address is already there."), "studio_domain");
  if (studioHosts().includes(hostname)) throw new HttpError(400, L("Ce domaine est celui du studio.", "This is the studio's domain."), "studio_domain");
  const existing = customOf(hostname) ?? addressOf(hostname);
  if (existing && existing.project_id !== projectId) {
    const stale = existing.kind === "custom" && existing.status === "pending_dns" && existing.created_at < now() - PENDING_CLAIM_MS;
    if (!stale) throw new HttpError(409, existing.status === "pending_dns"
      ? L("Ce domaine est en cours de liaison à un autre site, sans preuve encore : réessayez dans quelques jours, ou contactez-nous si ce domaine vous appartient.", "This domain is being linked to another site, without proof yet: try again in a few days, or contact us if this domain is yours.")
      : L("Ce domaine est déjà relié à un autre site. S'il vous appartient, retirez-le d'abord de cet autre site.", "This domain is already linked to another site. If it's yours, remove it from that site first."), "domain_taken");
    // Demande jamais prouvée depuis plus de 7 jours : elle cède la place (elle n'a jamais été servie).
    run("DELETE FROM site_addresses WHERE hostname = ? AND kind = 'custom' AND status = 'pending_dns'", hostname);
  }
  if (existing && existing.project_id === projectId) return existing;
  const count = one<{ n: number }>("SELECT COUNT(*) n FROM site_addresses WHERE project_id = ? AND kind = 'custom'", projectId)!.n;
  if (count >= MAX_CUSTOM_DOMAINS) throw new HttpError(409, L(`Au plus ${MAX_CUSTOM_DOMAINS} domaines personnalisés par site.`, `At most ${MAX_CUSTOM_DOMAINS} custom domains per site.`), "domain_limit");
  run("INSERT INTO site_addresses (hostname, project_id, kind, status, verify_token, created_at) VALUES (?,?,?,?,?,?)", hostname, projectId, "custom", "pending_dns", `ecs-${randomToken(18)}`, now());
  return addressOf(hostname)!;
}

export type Resolver = { txt: (name: string) => Promise<string[][]>; cname: (name: string) => Promise<string[]>; a?: (name: string) => Promise<string[]>; aaaa?: (name: string) => Promise<string[]> };
/** Résolveur DNS réel ; `SITES_DNS_SERVERS` permet de choisir les serveurs interrogés (ex. « 1.1.1.1,8.8.8.8 »). */
export function realResolver(): Resolver {
  const r = new DnsResolver({ timeout: 5000, tries: 2 });
  const servers = (process.env.SITES_DNS_SERVERS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (servers.length) r.setServers(servers);
  return { txt: (n) => r.resolveTxt(n), cname: (n) => r.resolveCname(n), a: (n) => r.resolve4(n), aaaa: (n) => r.resolve6(n) };
}

/** Preuve TXT présente ? Pointage correct ? (Sans rien écrire.) */
async function probe(d: SiteAddress, dns: Resolver): Promise<{ proof: boolean; proofError: string | null; routing: boolean; routingError: string | null }> {
  let proof = false, proofError: string | null = null;
  try {
    const records = (await dns.txt(proofName(d.hostname))).map((r) => r.join(""));
    proof = records.includes(d.verify_token ?? "");
    if (!proof) proofError = L("Enregistrement TXT de preuve introuvable ou différent.", "Proof TXT record missing or different.");
  } catch { proofError = L("Enregistrement TXT de preuve introuvable (la propagation DNS peut prendre jusqu'à 48 h).", "Proof TXT record not found (DNS propagation can take up to 48 h)."); }
  const ins = dnsInstructions(d);
  let routing = false, routingError: string | null = null;
  const norm = (x: string) => x.toLowerCase().replace(/\.$/, "");
  try {
    if (ins.pointing.type === "CNAME") {
      const c = (await dns.cname(d.hostname)).map(norm);
      routing = ins.pointing.values.some((v) => c.includes(v));
    } else {
      const ips = [...(await dns.a?.(d.hostname).catch(() => []) ?? []), ...(await dns.aaaa?.(d.hostname).catch(() => []) ?? [])];
      routing = ins.pointing.values.length > 0 && ips.length > 0 && ips.every((ip) => ins.pointing.values.includes(ip));
    }
  } catch { routing = false; }
  if (!routing) routingError = ins.pointing.values.length
    ? L(`Le domaine ne pointe pas encore vers ${ins.pointing.values.join(", ")} (${ins.pointing.type}).`, `The domain doesn't point to ${ins.pointing.values.join(", ")} yet (${ins.pointing.type}).`)
    : L("Pointage impossible à vérifier tant que l'adresse du serveur n'est pas connue.", "Pointing can't be checked until the server address is known.");
  return { proof, proofError, routing, routingError };
}

/**
 * Vérification demandée par le propriétaire : la preuve TXT exacte rend le domaine « vérifié » pour lui ; le pointage
 * est contrôlé et noté. Un domaine désactivé ou perdu est réactivé seulement par une preuve présente.
 */
export async function verifyCustomDomain(projectId: string, hostname: string, dns: Resolver = realResolver()): Promise<SiteAddress> {
  ensureDomainColumns();
  const a = customOf(hostname);
  if (!a || a.project_id !== projectId) throw new HttpError(404, L("Domaine introuvable.", "Domain not found."));
  const r = await probe(a, dns);
  const owner = ownerOf(projectId);
  // Preuve présente : vérifié pour le propriétaire actuel (un domaine désactivé le reste : il se réactive explicitement).
  if (r.proof) run("UPDATE site_addresses SET status = CASE WHEN status = 'disabled' THEN 'disabled' ELSE 'verified' END, verified_by = ?, verified_at = COALESCE(verified_at, ?), last_ok_at = ?, fail_count = 0, routing_ok = ?, checked_at = ?, check_error = ? WHERE hostname = ?", owner, now(), now(), r.routing ? 1 : 0, now(), r.routingError, hostname);
  else run("UPDATE site_addresses SET status = CASE WHEN status IN ('verified','lost','disabled') THEN status ELSE 'pending_dns' END, routing_ok = ?, checked_at = ?, check_error = ? WHERE hostname = ?", r.routing ? 1 : 0, now(), r.proofError, hostname);
  return addressOf(hostname)!;
}

/** Désactivation volontaire (réversible) : plus servi aussitôt ; la preuve reste valable pour réactiver. */
export function setCustomDomainEnabled(projectId: string, hostname: string, enabled: boolean, dns?: Resolver) {
  ensureDomainColumns();
  const a = customOf(hostname);
  if (!a || a.project_id !== projectId) throw new HttpError(404, L("Domaine introuvable.", "Domain not found."));
  if (!enabled) { run("UPDATE site_addresses SET status = 'disabled', disabled_at = ? WHERE hostname = ?", now(), hostname); return addressOf(hostname)!; }
  // Réactiver = revérifier : jamais servi sur la seule foi d'une ancienne preuve.
  run("UPDATE site_addresses SET status = 'pending_dns', disabled_at = NULL WHERE hostname = ?", hostname);
  return verifyCustomDomain(projectId, hostname, dns);
}

/** Retire un domaine personnalisé : il cesse aussitôt d'être servi (la publication du site n'est pas touchée). */
export function removeCustomDomain(projectId: string, hostname: string) {
  ensureDomainColumns();
  const a = customOf(hostname);
  if (!a || a.project_id !== projectId) throw new HttpError(404, L("Domaine introuvable.", "Domain not found."));
  run("DELETE FROM site_addresses WHERE hostname = ? AND project_id = ?", hostname, projectId);
}

/** Servi ? (vérifié par le propriétaire actuel, ni désactivé ni perdu ; la mise en service globale est vérifiée à part). */
export function customDomainServable(a: SiteAddress): boolean {
  const d = a as CustomDomain;
  return d.kind === "custom" && d.status === "verified" && !!d.verified_by && d.verified_by === ownerOf(d.project_id);
}

/**
 * Revérification quotidienne (worker) : preuve absente 3 fois de suite → « perdu » (domaine expiré, enregistrement
 * supprimé, domaine vendu…), plus servi ; le client le voit et peut revérifier après correction.
 */
export async function recheckDomains(dns: Resolver = realResolver(), limit = 20) {
  ensureDomainColumns();
  const due = all<CustomDomain>("SELECT * FROM site_addresses WHERE kind = 'custom' AND status = 'verified' AND (checked_at IS NULL OR checked_at < ?) ORDER BY checked_at LIMIT ?", now() - RECHECK_MS, limit);
  const lost: string[] = [];
  for (const d of due) {
    try {
      const r = await probe(d, dns);
      if (r.proof) run("UPDATE site_addresses SET fail_count = 0, last_ok_at = ?, routing_ok = ?, checked_at = ?, check_error = ? WHERE hostname = ?", now(), r.routing ? 1 : 0, now(), r.routingError, d.hostname);
      else {
        const fails = d.fail_count + 1;
        run("UPDATE site_addresses SET fail_count = ?, status = ?, checked_at = ?, check_error = ? WHERE hostname = ?", fails, fails >= LOST_AFTER ? "lost" : "verified", now(), fails >= LOST_AFTER ? L("Preuve TXT disparue depuis plusieurs vérifications (domaine expiré ou DNS modifié ?) : le domaine n'est plus servi. Rétablissez l'enregistrement puis revérifiez.", "Proof TXT record gone for several checks (expired domain or changed DNS?): the domain is no longer served. Restore the record, then verify again.") : r.proofError, d.hostname);
        if (fails >= LOST_AFTER) lost.push(d.hostname);
      }
    } catch (e) { logError("sites:domain-recheck", e, { projectId: d.project_id }); }
  }
  return { checked: due.length, lost };
}

/**
 * Question du proxy frontal avant d'émettre un certificat (Caddy « on_demand_tls ask ») : oui seulement pour une adresse
 * du studio active ou un domaine relié servable, d'un site en ligne avec forfait actif. Jeton partagé facultatif.
 */
export function askDomain(rawDomain: string | null, token: string | null): boolean {
  const expected = process.env.SITES_ASK_TOKEN;
  if (expected && (!token || token.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected)))) return false;
  const host = normalizeHost(rawDomain);
  if (!host) return false;
  ensureDomainColumns();
  const a = addressOf(host);
  if (!a) return false;
  const ok = a.kind === "studio" ? a.status === "active" : customDomainsEnabled() && customDomainServable(a);
  return ok && !!projectPlan(a.project_id) && !!livePublication(a.project_id);
}

/** Domaines reliés d'un projet, avec leur état lisible et leurs instructions. */
export function customDomains(projectId: string) {
  ensureDomainColumns();
  return all<CustomDomain>("SELECT * FROM site_addresses WHERE project_id = ? AND kind = 'custom' ORDER BY created_at", projectId)
    .map((d) => ({ hostname: d.hostname, state: domainState(d), checkedAt: d.checked_at, checkError: d.check_error, lastOkAt: d.last_ok_at, dns: dnsInstructions(d) }));
}
