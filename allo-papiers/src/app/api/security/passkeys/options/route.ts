import { json, route } from "@/lib/http";
import { requireElevated } from "@/lib/auth";
import { passkeyRegistrationOptions } from "@/lib/stepup";

/** Ajouter une passkey exige une vérification renforcée récente. */
export const POST = route(async () => {
  const { user, session } = await requireElevated();
  return json(await passkeyRegistrationOptions(user, session));
});
