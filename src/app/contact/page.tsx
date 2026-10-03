import { LegalPage } from "@/components/legal-page";
import { COMPANY } from "@/lib/legal";

export const metadata = { title: "Contact" };

export default function Page() {
  return (
    <LegalPage title="Contact" intro="Une question sur le studio, une demande sur vos données ou votre abonnement : écrivez-nous, nous répondons à chaque message.">
      <section>
        <h2>Nous écrire</h2>
        <p>E-mail : {COMPANY.email}</p>
        <p>Adresse : {COMPANY.legalName}, {COMPANY.address}</p>
      </section>
      <section>
        <h2>Déjà client ?</h2>
        <p>Votre abonnement, vos crédits et vos factures se gèrent depuis l'espace « Compte » du studio.</p>
      </section>
    </LegalPage>
  );
}
