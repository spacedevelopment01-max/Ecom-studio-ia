import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { ToastProvider } from "@/components/ui";

export const metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/connexion?suite=/studio");
  return <ToastProvider>{children}</ToastProvider>;
}
