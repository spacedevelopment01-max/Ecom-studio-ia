import { requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { cielCommun } from "@/lib/ciel/ciel-commun";

export const runtime = "nodejs";

/** Le ciel partagé, vu par ce compte : les projets des autres (anonymes s'ils sont verrouillés) et les visites reçues. */
export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const depuis = Number(new URL(req.url).searchParams.get("depuis")) || 0;
  return ok(cielCommun(user.id, depuis));
});
