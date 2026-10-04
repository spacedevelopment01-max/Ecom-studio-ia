import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { company } from "@/lib/legal";
import { OFFER } from "@/lib/billing";
import { intlLocale, pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await serverLang();
  return { title: pick(lang, "Conditions générales de vente et d'utilisation", "Terms of sale and use") };
}

export default async function Page() {
  const lang = await serverLang();
  const COMPANY = company(lang);
  const eur = (v: number) => v.toLocaleString(intlLocale(lang), { style: "currency", currency: "EUR" });
  if (lang === "en")
    return (
      <LegalPage title="Terms of sale and use" intro={`These terms govern the use of the ${COMPANY.brand} studio and the subscription to its plans. By creating an account, you accept them.`}>
        <section>
          <h2>1. The service</h2>
          <p>{COMPANY.brand} is an online studio that helps create a brand, an online store (Shopify, WooCommerce or PrestaShop theme, migration kit for Wix and Squarespace), images, videos and social media posts, based on the information and photos provided by the customer. Some features use artificial intelligence services.</p>
        </section>
        <section>
          <h2>2. Account</h2>
          <p>The customer provides accurate information and keeps their login credentials confidential. They are responsible for the use of their account. The service is intended for adults and professionals.</p>
        </section>
        <section>
          <h2>3. Prices and payment</h2>
          <ul>
            <li>Subscription for one store: {eur(OFFER.basePriceEur)} incl. VAT per month.</li>
            <li>Additional store: {eur(OFFER.extraStorePriceEur)} incl. VAT per month.</li>
            <li>Creation credit top-ups: in increments of {eur(OFFER.topupStepEur)} incl. VAT.</li>
          </ul>
          <p>The subscription includes creation credits renewed every month; unused monthly credits do not roll over. Top-up credits carry over from one month to the next as long as the account is active. When credits run out, new AI generations are paused; the rest of the studio keeps working. Payment is made by card through a secure payment provider; the subscription renews automatically every month.</p>
        </section>
        <section>
          <h2>4. Cancellation</h2>
          <p>The subscription has no commitment: it can be canceled at any time from the "Account" area or by writing to us, effective at the end of the current monthly period. Creations already downloaded or exported remain the customer's.</p>
        </section>
        <section>
          <h2>5. Right of withdrawal</h2>
          <p>Consumer customers have fourteen days to withdraw. When they request immediate performance of the service (a creation started before the end of this period) and acknowledge losing this right once the service has been fully performed, withdrawal no longer applies to services already provided. Credits used are non-refundable.</p>
        </section>
        <section>
          <h2>6. Customer content and creations</h2>
          <p>The customer warrants that they hold the rights to the photos, texts, logos and trademarks they upload. They remain solely responsible for the products sold and the information published (claims, prices, delivery times, reviews). The studio never invents reviews, figures or promises: information to be confirmed remains flagged "to complete", and the customer checks it before publishing.</p>
          <p>The creations obtained (brand, theme, images, videos, texts) belong to the customer, who may use them freely, including commercially. The studio may not be able to guarantee the uniqueness of a suggested name or logo: it is up to the customer to check their availability (registered trademarks, domain names) before any filing or use.</p>
        </section>
        <section>
          <h2>7. Posts and connections</h2>
          <p>Social media posts and uploads to a store only go out with the customer's approval, through each platform's official authorizations. The customer complies with the rules of these platforms.</p>
        </section>
        <section>
          <h2>8. Availability and liability</h2>
          <p>The service is provided with care, with no guarantee of commercial results. Occasional interruptions may occur for maintenance. The publisher's liability is limited to direct damages and, at most, to the amounts paid over the last twelve months, except in the event of gross negligence or contrary legal provisions.</p>
        </section>
        <section>
          <h2>9. Personal data</h2>
          <p>See the <a href="/confidentialite">privacy policy</a>.</p>
        </section>
        <section>
          <h2>10. Disputes</h2>
          <p>These terms are governed by French law. In the event of a dispute, consumer customers may use the consumer mediator free of charge: {COMPANY.mediator}. They may also use the European online dispute resolution platform.</p>
        </section>
        <section>
          <h2>11. Contact</h2>
          <p>{COMPANY.legalName}, {COMPANY.address}. {COMPANY.email}.</p>
        </section>
      </LegalPage>
    );
  return (
    <LegalPage title="Conditions générales de vente et d'utilisation" intro={`Ces conditions encadrent l'utilisation du studio ${COMPANY.brand} et la souscription à ses offres. En créant un compte, vous les acceptez.`}>
      <section>
        <h2>1. Le service</h2>
        <p>{COMPANY.brand} est un studio en ligne qui aide à créer une marque, une boutique en ligne (thème Shopify, WooCommerce ou PrestaShop, kit de reprise pour Wix et Squarespace), des images, des vidéos et des publications pour les réseaux sociaux, à partir des informations et des photos fournies par le client. Certaines fonctions utilisent des services d'intelligence artificielle.</p>
      </section>
      <section>
        <h2>2. Compte</h2>
        <p>Le client fournit des informations exactes et garde ses identifiants confidentiels. Il est responsable de l'utilisation de son compte. Le service est destiné aux personnes majeures et aux professionnels.</p>
      </section>
      <section>
        <h2>3. Prix et paiement</h2>
        <ul>
          <li>Abonnement pour une boutique : {eur(OFFER.basePriceEur)} TTC par mois.</li>
          <li>Boutique supplémentaire : {eur(OFFER.extraStorePriceEur)} TTC par mois.</li>
          <li>Recharges de crédits de création : par tranches de {eur(OFFER.topupStepEur)} TTC.</li>
        </ul>
        <p>L'abonnement inclut des crédits de création renouvelés chaque mois ; les crédits mensuels non utilisés ne sont pas reportés. Les crédits rechargés sont conservés d'un mois à l'autre tant que le compte est actif. Lorsque les crédits sont épuisés, les nouvelles générations par IA sont mises en pause ; le reste du studio continue de fonctionner. Le paiement est effectué par carte via un prestataire de paiement sécurisé ; l'abonnement est renouvelé automatiquement chaque mois.</p>
      </section>
      <section>
        <h2>4. Résiliation</h2>
        <p>L'abonnement est sans engagement : il peut être résilié à tout moment depuis l'espace « Compte » ou en nous écrivant, avec effet à la fin de la période mensuelle en cours. Les créations déjà téléchargées ou exportées restent au client.</p>
      </section>
      <section>
        <h2>5. Droit de rétractation</h2>
        <p>Le client consommateur dispose d'un délai de quatorze jours pour se rétracter. Lorsqu'il demande l'exécution immédiate du service (création lancée avant la fin de ce délai) et reconnaît perdre ce droit une fois le service pleinement exécuté, la rétractation ne s'applique plus aux prestations déjà fournies. Les crédits consommés ne sont pas remboursables.</p>
      </section>
      <section>
        <h2>6. Contenus du client et créations</h2>
        <p>Le client garantit disposer des droits sur les photos, textes, logos et marques qu'il importe. Il reste seul responsable des produits vendus et des informations publiées (allégations, prix, délais, avis). Le studio n'invente ni avis, ni chiffres, ni promesses : les informations à confirmer restent signalées « à compléter » et le client les vérifie avant publication.</p>
        <p>Les créations obtenues (marque, thème, images, vidéos, textes) appartiennent au client, qui peut les utiliser librement, y compris commercialement. Le studio peut ne pas garantir l'unicité d'un nom ou d'un logo proposé : il appartient au client d'en vérifier la disponibilité (marques déposées, noms de domaine) avant tout dépôt ou usage.</p>
      </section>
      <section>
        <h2>7. Publications et connexions</h2>
        <p>Les publications sur les réseaux sociaux et l'envoi vers une boutique ne partent qu'avec l'accord du client, via les autorisations officielles de chaque plateforme. Le client respecte les règles de ces plateformes.</p>
      </section>
      <section>
        <h2>8. Disponibilité et responsabilité</h2>
        <p>Le service est fourni avec soin, sans garantie de résultat commercial. Des interruptions ponctuelles peuvent survenir pour maintenance. La responsabilité de l'éditeur est limitée aux dommages directs et, au plus, aux sommes versées au cours des douze derniers mois, sauf faute lourde ou disposition légale contraire.</p>
      </section>
      <section>
        <h2>9. Données personnelles</h2>
        <p>Voir la <a href="/confidentialite">politique de confidentialité</a>.</p>
      </section>
      <section>
        <h2>10. Litiges</h2>
        <p>Ces conditions sont soumises au droit français. En cas de litige, le client consommateur peut recourir gratuitement au médiateur de la consommation : {COMPANY.mediator}. Il peut aussi utiliser la plateforme européenne de règlement en ligne des litiges.</p>
      </section>
      <section>
        <h2>11. Contact</h2>
        <p>{COMPANY.legalName}, {COMPANY.address}. {COMPANY.email}.</p>
      </section>
    </LegalPage>
  );
}
