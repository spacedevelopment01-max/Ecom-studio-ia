import { LegalPage } from "@/components/legal-page";
import { COMPANY } from "@/lib/legal";

export const metadata = { title: "Mentions légales" };

export default function Page() {
  return (
    <LegalPage title="Mentions légales">
      <section>
        <h2>Éditeur du site</h2>
        <p>Le site et le studio {COMPANY.brand} sont édités par <strong>{COMPANY.legalName}</strong>, {COMPANY.legalForm}, dont le siège est situé {COMPANY.address}.</p>
        <p>Immatriculation : {COMPANY.registration}. TVA : {COMPANY.vat}.</p>
        <p>Directeur de la publication : {COMPANY.director}. Contact : {COMPANY.email}.</p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>Studio : {COMPANY.host}.</p>
        <p>Site vitrine : GitHub Pages, GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</p>
      </section>
      <section>
        <h2>Propriété intellectuelle</h2>
        <p>Les textes, logiciels, visuels et vidéos de ce site sont protégés. Toute reproduction sans autorisation est interdite. Les démonstrations présentent des produits réels de fournisseurs ; les marques et boutiques qui y figurent sont des créations du studio à titre d'exemple.</p>
        <p>Les créations réalisées par un client avec le studio (marque, thème, images, vidéos, textes) lui appartiennent, dans les conditions prévues par les <a href="/conditions">conditions générales</a>.</p>
      </section>
      <section>
        <h2>Données personnelles et cookies</h2>
        <p>Voir la <a href="/confidentialite">politique de confidentialité</a> et la <a href="/cookies">page cookies</a>.</p>
      </section>
    </LegalPage>
  );
}
