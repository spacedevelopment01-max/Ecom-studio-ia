import { RegistrationConfirmation } from "@/components/registration-confirmation";
import { registrationTokenValid } from "@/lib/registration";
export const dynamic = "force-dynamic";
export const metadata = { title: "Confirmation", robots: { index: false }, referrer: "no-referrer" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const q=await searchParams;const token=typeof q.jeton==="string"?q.jeton:"";
  return <RegistrationConfirmation token={token} valid={registrationTokenValid(token)} />;
}
