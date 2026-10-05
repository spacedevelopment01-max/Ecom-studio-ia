import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { safeNextPath } from "@/lib/safe-path";
import { currentUser } from "@/lib/auth";
import { ToastProvider } from "@/components/ui";

export const metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  // Sans session : retour à la page demandée après la connexion (chemin interne uniquement).
  if (!user) redirect(`/connexion?suite=${encodeURIComponent(safeNextPath((await headers()).get("x-ecs-path")))}`);
  return <ToastProvider>{children}</ToastProvider>;
}
