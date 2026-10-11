import { CallsPage } from "@/components/studio/calls";
import { serverLang } from "@/lib/i18n-server";
import { pick } from "@/lib/i18n";

export async function generateMetadata() {
  const lang = await serverLang();
  return { title: pick(lang, "Rendez-vous", "Appointments") };
}

export default function Page() {
  return <CallsPage />;
}
