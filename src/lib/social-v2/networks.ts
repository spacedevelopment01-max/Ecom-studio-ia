/**
 * État RÉEL de chaque réseau pour un projet (Autopilot V2) — jamais « connecté » parce que le code de l'adaptateur
 * existe. Six états : connecté, à connecter, autorisation expirée, publication automatique disponible, autorisation
 * supplémentaire nécessaire, fonction non disponible. `verified` dit si une publication a déjà réellement abouti sur
 * ce réseau depuis le studio (identifiant renvoyé par le réseau) : sinon, l'envoi n'a jamais été vérifié sur un vrai
 * compte, et l'écran le dit.
 */
import { all, one, now } from "../db";
import type { Project } from "../projects";
import { capabilitiesOf } from "../social/publish";
import { providerConfig } from "../social/oauth";
import { planOfProject } from "../plan-gates";
import { PLANS } from "../plans";
import { PLATFORMS, platformSpec, type Platform } from "./platforms";

export type NetworkState = "connected" | "to_connect" | "expired" | "auto_available" | "needs_permission" | "unavailable";
export type NetworkStatus = { platform: Platform; label: string; state: NetworkState; text: { fr: string; en: string }; account: string | null; connectionId: string | null; missing: string[]; verified: boolean; note: { fr: string; en: string } | null };

export const NETWORK_STATE_LABEL: Record<NetworkState, { fr: string; en: string }> = {
  connected: { fr: "Connecté", en: "Connected" },
  to_connect: { fr: "À connecter", en: "To connect" },
  expired: { fr: "Autorisation expirée", en: "Authorization expired" },
  auto_available: { fr: "Publication automatique disponible", en: "Automatic publishing available" },
  needs_permission: { fr: "Autorisation supplémentaire nécessaire", en: "Additional permission needed" },
  unavailable: { fr: "Fonction non disponible", en: "Not available" },
};

type Conn = { id: string; provider: string; name: string; status: string; scopes: string; expires_at: number | null; refresh_token: string | null };

export function networkStatus(p: Project, platform: Platform): NetworkStatus {
  const spec = platformSpec(platform);
  const base = { platform, label: spec.label, account: null as string | null, connectionId: null as string | null, missing: [] as string[], note: null as NetworkStatus["note"] };
  const verified = !!one("SELECT 1 FROM posts WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?) AND network = ? AND status = 'published' AND remote_id IS NOT NULL LIMIT 1", p.userId, platform);
  const out = (state: NetworkState, extra: Partial<NetworkStatus> = {}): NetworkStatus => ({ ...base, state, text: NETWORK_STATE_LABEL[state], verified, ...extra });
  if (spec.level !== "ready_to_connect") return out("unavailable", { note: { fr: `${spec.label} : pas de publication depuis le studio, le contenu se copie et se publie à la main.`, en: `${spec.label}: no publishing from the studio, the content is copied and posted by hand.` } });
  const conns = all<Conn>("SELECT c.id, c.provider, c.name, c.status, c.scopes, c.expires_at, c.refresh_token FROM connections c LEFT JOIN project_connections pc ON pc.connection_id = c.id AND pc.project_id = ? WHERE c.user_id = ? AND c.provider = ? ORDER BY pc.project_id IS NULL, c.status = 'active' DESC, c.updated_at DESC", p.id, p.userId, platform);
  const c = conns[0];
  if (!c) {
    const configured = spec.provider ? providerConfig(spec.provider as never).configured : false;
    return out("to_connect", configured ? {} : { note: { fr: "La connexion à ce réseau n'est pas encore ouverte sur le studio (application du réseau à configurer par l'administrateur).", en: "Connecting this network isn't open on the studio yet (the network app must be set up by the administrator)." } });
  }
  const acc = { account: c.name, connectionId: c.id };
  const expiredToken = c.expires_at != null && c.expires_at < now() && !c.refresh_token;
  if (c.status !== "active" || expiredToken) return out("expired", { ...acc, note: { fr: "Reconnectez le compte : rien ne part tant que l'autorisation n'est pas renouvelée.", en: "Reconnect the account: nothing is sent until the authorization is renewed." } });
  const caps = capabilitiesOf({ provider: c.provider, scopes: c.scopes });
  if (caps.missing.length && !caps.can.length) return out("needs_permission", { ...acc, missing: caps.missing });
  const plan = planOfProject(p.id);
  if (!plan || !PLANS[plan].autopublish) return out("connected", { ...acc, missing: caps.missing, note: { fr: "Compte connecté ; la publication automatique demande un forfait qui l'inclut.", en: "Account connected; automatic publishing needs a plan that includes it." } });
  return out("auto_available", { ...acc, missing: caps.missing, note: verified ? null : { fr: "Jamais encore vérifiée sur un vrai compte depuis le studio.", en: "Not yet verified on a real account from the studio." } });
}

export const networkStatuses = (p: Project): NetworkStatus[] => PLATFORMS.map((pl) => networkStatus(p, pl));
