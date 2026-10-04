import { requireSession, isElevated, userHasPasskey } from "@/lib/auth";
import { Vault } from "./vault";

export const metadata = { title: "Coffre-fort" };

export default async function Page() {
  const { user, session } = await requireSession();
  return <Vault elevated={isElevated(session)} until={session.elevated_until ? new Date(session.elevated_until).toISOString() : null} hasPasskey={await userHasPasskey(user.id)} />;
}
