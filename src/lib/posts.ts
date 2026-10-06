/** Représentation d'une publication pour l'interface. */
import { getAsset, publicAssetSummary } from "./library";
import { postAdvice } from "./engine/social-quality";
import { uiLang } from "./i18n-server";

export function postView(r: any) {
  const media = (JSON.parse(r.media || "[]") as string[]).map((m) => getAsset(m)).filter(Boolean).map((a) => publicAssetSummary(a!));
  return { id: r.id, network: r.network, format: r.format, status: r.status, scheduledAt: r.scheduled_at, timezone: r.timezone, title: r.title, caption: r.caption, hashtags: r.hashtags, link: r.link, angle: r.angle, media, connectionId: r.connection_id, connectionName: r.connection_name ?? null, planId: r.plan_id, campaignId: r.campaign_id, error: r.error, remoteUrl: r.remote_url, publishedAt: r.published_at, autoApproved: !!r.auto_approved, approvedAt: r.approved_at, attempts: r.attempts, advice: ["published", "publishing", "cancelled"].includes(r.status) ? [] : postAdvice(r, uiLang()) };
}
