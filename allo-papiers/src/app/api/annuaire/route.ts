import { HttpError, json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { ORGANISM_PIVOTS, searchOffices, ANNUAIRE_SITE } from "@/lib/annuaire";
import { rateLimit } from "@/lib/rate-limit";

/** Recherche dans l'annuaire officiel. La position n'est utilisée que pour cette recherche et n'est pas conservée. */
export const GET = route(async (req) => {
  const { user } = await requireSession();
  await rateLimit(`annuaire:${user.id}`, 60, 3600);
  const url = new URL(req.url);
  const kind = url.searchParams.get("type") ?? "france_services";
  if (!(kind in ORGANISM_PIVOTS)) throw new HttpError(400, "type", "Type d'organisme inconnu.");
  const cp = url.searchParams.get("cp") ?? undefined;
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");
  const result = await searchOffices(kind as keyof typeof ORGANISM_PIVOTS, {
    postalCode: cp,
    lat: lat ? Number(lat) : undefined,
    lon: lon ? Number(lon) : undefined,
  });
  return json({ ...result, officialSearch: ANNUAIRE_SITE, espace: ORGANISM_PIVOTS[kind].espace ?? null });
});
