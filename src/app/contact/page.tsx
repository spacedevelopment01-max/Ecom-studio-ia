import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { company } from "@/lib/legal";
import { serverLang } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Contact" };
}

export default async function Page() {
  const lang = await serverLang();
  const COMPANY = company(lang);
  if (lang === "en")
    return (
      <LegalPage title="Contact" intro="A question about the studio, a request about your data or your subscription: write to us, we reply to every message.">
        <section>
          <h2>Write to us</h2>
          <p>Email: {COMPANY.email}</p>
          <p>Address: {COMPANY.legalName}, {COMPANY.address}</p>
        </section>
        <section>
          <h2>Already a customer?</h2>
          <p>Your plan, packs and invoices are managed from the studio's "My account" area.</p>
        </section>
      </LegalPage>
    );
  return (
    <LegalPage title="Contact" intro="Une question sur le studio, une demande sur vos données ou votre abonnement : écrivez-nous, nous répondons à chaque message.">
      <section>
        <h2>Nous écrire</h2>
        <p>E-mail : {COMPANY.email}</p>
        <p>Adresse : {COMPANY.legalName}, {COMPANY.address}</p>
      </section>
      <section>
        <h2>Déjà client ?</h2>
        <p>Votre forfait, vos packs et vos factures se gèrent depuis l'espace « Mon compte » du studio.</p>
      </section>
    </LegalPage>
  );
}
