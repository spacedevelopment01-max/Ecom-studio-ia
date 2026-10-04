import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { company } from "@/lib/legal";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await serverLang();
  return { title: pick(lang, "Mentions légales", "Legal notice") };
}

export default async function Page() {
  const lang = await serverLang();
  const COMPANY = company(lang);
  if (lang === "en")
    return (
      <LegalPage title="Legal notice">
        <section>
          <h2>Website publisher</h2>
          <p>The {COMPANY.brand} website and studio are published by <strong>{COMPANY.legalName}</strong>, {COMPANY.legalForm}, with its registered office at {COMPANY.address}.</p>
          <p>Registration: {COMPANY.registration}. VAT: {COMPANY.vat}.</p>
          <p>Publication director: {COMPANY.director}. Contact: {COMPANY.email}.</p>
        </section>
        <section>
          <h2>Hosting</h2>
          <p>Studio: {COMPANY.host}.</p>
          <p>Showcase website: GitHub Pages, GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, United States.</p>
        </section>
        <section>
          <h2>Intellectual property</h2>
          <p>The texts, software, visuals and videos on this website are protected. Any reproduction without permission is prohibited. The demos feature real supplier products; the brands and stores shown are example creations by the studio.</p>
          <p>Creations made by a customer with the studio (brand, theme, images, videos, texts) belong to them, under the conditions set out in the <a href="/conditions">terms and conditions</a>.</p>
        </section>
        <section>
          <h2>Personal data and cookies</h2>
          <p>See the <a href="/confidentialite">privacy policy</a> and the <a href="/cookies">cookies page</a>.</p>
        </section>
      </LegalPage>
    );
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
