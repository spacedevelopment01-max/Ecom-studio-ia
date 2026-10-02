import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { ToastProvider } from "@/components/ui";
import { AdminConsole } from "@/components/admin";

export const metadata = { title: "Administration" };
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
