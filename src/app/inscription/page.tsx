import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Créer un compte" };
export default async function Page() {
  if (await currentUser()) redirect("/studio");
  return <AuthForm mode="register" />;
}
