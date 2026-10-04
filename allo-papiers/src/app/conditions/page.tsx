import { LegalView } from "@/components/legal-page";
import { LEGAL_PAGES } from "@/content/legal";

export const metadata = { title: LEGAL_PAGES["conditions"].title };

export default function Page() {
  return <LegalView page={LEGAL_PAGES["conditions"]} />;
}
