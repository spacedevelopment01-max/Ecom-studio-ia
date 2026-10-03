import { LegalPage } from "@/components/legal-page";
import { COMPANY } from "@/lib/legal";
import { OFFER } from "@/lib/billing";

export const metadata = { title: "Conditions générales de vente et d'utilisation" };
const eur = (v: number) => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export default function Page() {
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
