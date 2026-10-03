import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { currentUser } from "@/lib/auth";

export const metadata = { title: "Connexion" };
export default async function Page() {
  if (await currentUser()) redirect("/studio");
  return <AuthForm mode="login" />;
}
