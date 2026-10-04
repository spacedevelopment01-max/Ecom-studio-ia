import { json, route } from "@/lib/http";
import { requireElevated } from "@/lib/auth";
import { listVault } from "@/lib/vault";
import { audit } from "@/lib/audit";

/** Contenu du coffre, rangé par catégorie. Coffre ouvert obligatoire. */
export const GET = route(async (req) => {
  const { user } = await requireElevated();
  const items = await listVault(user.id);
  await audit(user.id, "coffre_consulte", { userAgent: req.headers.get("user-agent") });
  return json({ items });
});
