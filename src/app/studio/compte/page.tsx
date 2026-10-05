import { AccountPage } from "@/components/account";
import { serverLang } from "@/lib/i18n-server";
import { pick } from "@/lib/i18n";

export async function generateMetadata() {
  const lang = await serverLang();
  return { title: pick(lang, "Mon compte", "My account") };
}

export default function Page() {
  return <AccountPage />;
}
