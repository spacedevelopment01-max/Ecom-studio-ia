import { handle, ok } from "@/lib/http";
import { fontCatalog } from "@/lib/media/fonts";

export const runtime = "nodejs";

/** Catalogue des polices du studio (familles, graisses chargées, alias) : l'éditeur charge les mêmes que le serveur. */
export const GET = handle(async () => ok({ fonts: fontCatalog() }, { headers: { "Cache-Control": "public, max-age=3600" } }));
