/**
 * « Publier votre site » (#232, prototype) : adresse, publication figée, historique, restauration, retrait, demandes
 * reçues et domaines personnalisés. Propriétaire du projet seulement ; publication avec forfait actif (inclus, sans
 * supplément). Rien n'est servi tant que l'hébergement n'est pas configuré (SITES_DOMAIN).
 */
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { L } from "@/lib/i18n-server";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { customDomainsEnabled, sitesDomain } from "@/lib/sites/host-match";
import { bookingBlockers, publishBlockers, publishSite, renderSite, restorePublication, unpublishSite, PublishBlocked } from "@/lib/sites/publish";
import { sitePolicies, updatePolicy } from "@/lib/sites/policies";
import { currentTheme } from "@/lib/projects";
import { withBiens } from "@/lib/biens";
import type { ThemeSpec } from "@/lib/theme/spec";
import { addCustomDomain, dnsInstructions, removeCustomDomain, verifyCustomDomain } from "@/lib/sites/domains";
import { deleteRequest, markRequestRead, siteRequests } from "@/lib/sites/requests";
import { addresses, history, livePublication, publications, setStudioAddress } from "@/lib/sites/store";

function overview(projectId: string) {
  const live = livePublication(projectId);
  return {
    configured: !!sitesDomain(),
    sitesDomain: sitesDomain(),
    customDomainsServed: customDomainsEnabled(),
    live: live ? { id: live.id, number: live.number, origin: live.origin, createdAt: live.created_at, pages: live.pages } : null,
    publications: publications(projectId).map((p) => ({ id: p.id, number: p.number, createdAt: p.created_at, pages: p.pages, bytes: p.bytes, themeVersionId: p.theme_version_id, live: p.id === live?.id })),
    history: history(projectId),
    addresses: addresses(projectId).map((a) => ({ hostname: a.hostname, kind: a.kind, status: a.status, checkedAt: a.checked_at, checkError: a.check_error, dns: a.kind === "custom" ? dnsInstructions(a) : null })),
    requests: siteRequests(projectId),
    policies: sitePolicies(projectId),
  };
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(overview(p.id));
});

const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish") }),
  z.object({ action: z.literal("check") }),
  z.object({ action: z.literal("policy"), handle: z.string().max(80), title: z.string().max(120), text: z.string().max(20000) }),
  z.object({ action: z.literal("restore"), publicationId: z.string().max(40) }),
  z.object({ action: z.literal("unpublish") }),
  z.object({ action: z.literal("address"), slug: z.string().max(60) }),
  z.object({ action: z.literal("domain-add"), hostname: z.string().max(260) }),
  z.object({ action: z.literal("domain-verify"), hostname: z.string().max(260) }),
  z.object({ action: z.literal("domain-remove"), hostname: z.string().max(260) }),
  z.object({ action: z.literal("request-read"), id: z.string().max(40) }),
  z.object({ action: z.literal("request-delete"), id: z.string().max(40) }),
]);

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, Schema);
  if (!sitesDomain() && !["request-read", "request-delete"].includes(b.action)) throw new HttpError(409, L("L'hébergement des sites n'est pas configuré sur ce studio.", "Site hosting isn't configured on this studio."), "sites_not_configured");
  if (b.action === "check") {
    // Vérification sans publier : mêmes pages et mêmes règles que la publication, rien n'est écrit.
    const cur = currentTheme(p.id);
    if (!cur) return ok({ ...overview(p.id), reasons: [L("Créez d'abord le site dans l'onglet Site.", "Create the site in the Site tab first.")] });
    const spec = withBiens(cur.spec as ThemeSpec, p.id);
    return ok({ ...overview(p.id), reasons: [...bookingBlockers(p.id, spec), ...publishBlockers(await renderSite(spec, "https://verification.invalid"))] });
  }
  try {
    if (b.action === "policy") updatePolicy(p.id, b.handle, b.title, b.text);
    if (b.action === "publish") await publishSite(p.id, user.id);
    if (b.action === "restore") restorePublication(p.id, b.publicationId, user.id);
    if (b.action === "unpublish") unpublishSite(p.id, user.id);
    if (b.action === "address") setStudioAddress(p.id, b.slug.trim().toLowerCase());
    if (b.action === "domain-add") addCustomDomain(p.id, b.hostname);
    if (b.action === "domain-verify") await verifyCustomDomain(p.id, b.hostname.trim().toLowerCase());
    if (b.action === "domain-remove") removeCustomDomain(p.id, b.hostname.trim().toLowerCase());
    if (b.action === "request-read") markRequestRead(p.id, b.id);
    if (b.action === "request-delete") deleteRequest(p.id, b.id);
  } catch (e) {
    if (e instanceof PublishBlocked) return Response.json({ error: e.message, code: "publish_blocked", reasons: e.reasons }, { status: 409 });
    throw e;
  }
  return ok(overview(p.id));
});
