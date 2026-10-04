import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { ToastProvider } from "@/components/ui";
import { AdminConsole } from "@/components/admin";
import { serverLang } from "@/lib/i18n-server";
import { pick } from "@/lib/i18n";

export async function generateMetadata() {
  const lang = await serverLang();
  return { title: pick(lang, "Administration", "Admin") };
}
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/connexion?suite=/admin");
  if (user.role !== "admin") redirect("/studio");
  return (
    <ToastProvider>
      <AdminConsole />
    </ToastProvider>
  );
}
