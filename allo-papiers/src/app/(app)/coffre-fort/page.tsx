import { requirePageSession, isElevated, userHasPasskey } from "@/lib/auth";
import { Vault } from "./vault";

export const metadata = { title: "Coffre-fort" };

export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const { user, session } = await requirePageSession();
  return (
    <Vault
      elevated={isElevated(session)}
      until={session.elevated_until ? new Date(session.elevated_until).toISOString() : null}
      hasPasskey={await userHasPasskey(user.id)}
      highlight={range}
    />
  );
}
