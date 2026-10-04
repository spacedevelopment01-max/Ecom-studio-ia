import { json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { passkeyStepUpOptions } from "@/lib/stepup";

export const POST = route(async () => {
  const { user, session } = await requireSession({ allowLocked: true });
  return json(await passkeyStepUpOptions(user, session));
});
