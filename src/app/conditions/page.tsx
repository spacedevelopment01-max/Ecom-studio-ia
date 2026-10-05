import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { company } from "@/lib/legal";
import { PACKS_FOR_SALE, PACKS, PLAN_IDS, PLANS, REFUND_DAYS } from "@/lib/plans";
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
  const discount = PLAN_IDS.filter((id) => PLANS[id].packDiscount > 0).map((id) => `${PLANS[id].name[lang]} (-${Math.round(PLANS[id].packDiscount * 100)}${lang === "en" ? "" : "\u00a0"}%)`).join(", ");
  const rollover = PLAN_IDS.filter((id) => PLANS[id].rollover).map((id) => PLANS[id].name[lang]).join(lang === "en" ? " and " : " et ");
  if (lang === "en")
    return (
      <LegalPage title="Terms of sale and use" intro={`These terms govern the use of the ${COMPANY.brand} studio and the subscription to its plans and packs. By creating an account, you accept them.`}>
        <section>
          <h2>1. The service</h2>
          <p>{COMPANY.brand} is an online studio that helps create a brand, an online store (Shopify, WooCommerce or PrestaShop theme, migration kit for Wix and Squarespace), images, videos and social media posts, based on the information and photos provided by the customer. Some features use artificial intelligence services.</p>
        </section>
        <section>
          <h2>2. Account</h2>
          <p>The customer provides accurate information and keeps their login credentials confidential. They are responsible for the use of their account. The service is intended for adults and professionals.</p>
        </section>
        <section>
          <h2>3. Plans, prices and payment</h2>
          <p>Each subscription covers <strong>one store or one website</strong>, whatever the plan. A second store requires a second subscription.</p>
          <ul>
            {PLAN_IDS.map((id) => (
              <li key={id}>
                {PLANS[id].name.en} plan: {eur(PLANS[id].price.month)} incl. VAT per month, or {eur(PLANS[id].price.year)} incl. VAT per year (2 months free). Each month it includes {PLANS[id].quotas.visuals} AI visuals and {PLANS[id].quotas.aiVideos} AI videos{PLANS[id].quotas.ugc ? `, ${PLANS[id].quotas.ugc} UGC video(s)` : ""}{PLANS[id].quotas.blog ? `, ${PLANS[id].quotas.blog} blog posts` : ""}.
              </li>
            ))}
          </ul>
          <p>Quotas are renewed at the start of each monthly period. Unused quotas are lost at the end of the period, except on the {rollover} plans, where they roll over to the next month (for one month at most). Features marked "Soon" on the pricing page are not available yet.</p>
          <p>Packs, added to a plan: {PACKS_FOR_SALE.map((id) => `${PACKS[id].name.en} ${eur(PACKS[id].price)}`).join(", ")} incl. VAT (before discount). Discount according to the plan: {discount}. Packs never expire; the Launch pack can only be bought once. [To complete: what happens to unused packs when the subscription ends.]</p>
          <p>Payment is made by card through a secure payment provider; the subscription renews automatically at the end of each period (month or year).</p>
        </section>
        <section>
          <h2>4. Free discovery</h2>
          <p>Without a subscription or a credit card, each account can make one free discovery: product analysis by AI, brand, logos and a preview of the home page marked "Preview". It does not include AI images or videos, nor the export or publication of the store.</p>
        </section>
        <section>
          <h2>5. Changing plan and cancellation</h2>
          <p>The plan can be changed at any time from the "My account" area. The monthly subscription has no commitment: it can be canceled at any time from the "My account" area or by writing to us, effective at the end of the current period. Creations already downloaded or exported remain the customer's. [To complete: proration terms when changing plan.]</p>
        </section>
        <section>
          <h2>6. Money-back guarantee and right of withdrawal</h2>
          <p>Money-back guarantee: the customer may request a full refund of their subscription within {REFUND_DAYS} days of subscribing, by writing to us. [To complete: precise terms (first subscription only, treatment of packs already used).]</p>
          <p>Consumer customers also have fourteen days to withdraw. When they request immediate performance of the service (a creation started before the end of this period) and acknowledge losing this right once the service has been fully performed, withdrawal no longer applies to services already provided.</p>
        </section>
        <section>
          <h2>7. Customer content and creations</h2>
          <p>The customer warrants that they hold the rights to the photos, texts, logos and trademarks they upload. They remain solely responsible for the products sold and the information published (claims, prices, delivery times, reviews). The studio never invents reviews, figures or promises: information to be confirmed remains flagged "to complete", and the customer checks it before publishing.</p>
          <p>The creations obtained (brand, theme, images, videos, texts) belong to the customer, who may use them freely, including commercially. The studio may not be able to guarantee the uniqueness of a suggested name or logo: it is up to the customer to check their availability (registered trademarks, domain names) before any filing or use.</p>
        </section>
        <section>
          <h2>8. Posts and connections</h2>
          <p>Social media posts and uploads to a store only go out with the customer's approval, through each platform's official authorizations. The customer complies with the rules of these platforms.</p>
        </section>
        <section>
          <h2>9. Availability and liability</h2>
          <p>The service is provided with care, with no guarantee of commercial results. Occasional interruptions may occur for maintenance. The publisher's liability is limited to direct damages and, at most, to the amounts paid over the last twelve months, except in the event of gross negligence or contrary legal provisions.</p>
        </section>
        <section>
          <h2>10. Personal data</h2>
          <p>See the <a href="/confidentialite">privacy policy</a>.</p>
        </section>
        <section>
          <h2>11. Disputes</h2>
          <p>These terms are governed by French law. In the event of a dispute, consumer customers may use the consumer mediator free of charge: {COMPANY.mediator}. They may also use the European online dispute resolution platform.</p>
        </section>
        <section>
          <h2>12. Contact</h2>
          <p>{COMPANY.legalName}, {COMPANY.address}. {COMPANY.email}.</p>
        </section>
      </LegalPage>
    );
  return (
    <LegalPage title="Conditions générales de vente et d'utilisation" intro={`Ces conditions encadrent l'utilisation du studio ${COMPANY.brand} et la souscription à ses forfaits et packs. En créant un compte, vous les acceptez.`}>
      <section>
        <h2>1. Le service</h2>
        <p>{COMPANY.brand} est un studio en ligne qui aide à créer une marque, une boutique en ligne (thème Shopify, WooCommerce ou PrestaShop, kit de reprise pour Wix et Squarespace), des images, des vidéos et des publications pour les réseaux sociaux, à partir des informations et des photos fournies par le client. Certaines fonctions utilisent des services d'intelligence artificielle.</p>
      </section>
      <section>
        <h2>2. Compte</h2>
        <p>Le client fournit des informations exactes et garde ses identifiants confidentiels. Il est responsable de l'utilisation de son compte. Le service est destiné aux personnes majeures et aux professionnels.</p>
      </section>
      <section>
        <h2>3. Forfaits, prix et paiement</h2>
        <p>Chaque abonnement couvre <strong>une seule boutique ou un seul site</strong>, quel que soit le forfait. Une deuxième boutique nécessite un deuxième abonnement.</p>
        <ul>
          {PLAN_IDS.map((id) => (
            <li key={id}>
              Forfait {PLANS[id].name.fr} : {eur(PLANS[id].price.month)} TTC par mois, ou {eur(PLANS[id].price.year)} TTC par an (2 mois offerts). Il comprend chaque mois {PLANS[id].quotas.visuals} visuels IA et {PLANS[id].quotas.aiVideos} vidéos IA{PLANS[id].quotas.ugc ? `, ${PLANS[id].quotas.ugc} vidéo(s) UGC` : ""}{PLANS[id].quotas.blog ? `, ${PLANS[id].quotas.blog} articles de blog` : ""}.
            </li>
          ))}
        </ul>
        <p>Les quotas sont renouvelés au début de chaque période mensuelle. Les quotas non utilisés sont perdus à la fin de la période, sauf avec les forfaits {rollover}, où ils sont reportés au mois suivant (dans la limite d'un mois). Les fonctions signalées « Bientôt » sur la page des tarifs ne sont pas encore disponibles.</p>
        <p>Packs, à ajouter à un forfait : {PACKS_FOR_SALE.map((id) => `${PACKS[id].name.fr} ${eur(PACKS[id].price)}`).join(", ")} TTC (avant remise). Remise selon le forfait : {discount}. Les packs n'expirent pas ; le Pack Lancement ne peut être acheté qu'une fois. [À compléter : sort des packs non utilisés en cas de fin d'abonnement.]</p>
        <p>Le paiement est effectué par carte via un prestataire de paiement sécurisé ; l'abonnement est renouvelé automatiquement à la fin de chaque période (mois ou année).</p>
      </section>
      <section>
        <h2>4. Découverte gratuite</h2>
        <p>Sans abonnement ni carte bancaire, chaque compte peut faire une découverte gratuite : analyse du produit par l'IA, marque, logos et aperçu de la page d'accueil marqué « Aperçu ». Elle ne comprend ni images ni vidéos IA, ni l'export ou la publication de la boutique.</p>
      </section>
      <section>
        <h2>5. Changement de forfait et résiliation</h2>
        <p>Le forfait peut être changé à tout moment depuis l'espace « Mon compte ». L'abonnement mensuel est sans engagement : il peut être résilié à tout moment depuis l'espace « Mon compte » ou en nous écrivant, avec effet à la fin de la période en cours. Les créations déjà téléchargées ou exportées restent au client. [À compléter : modalités de prorata lors d'un changement de forfait.]</p>
      </section>
      <section>
        <h2>6. Satisfait ou remboursé et droit de rétractation</h2>
        <p>Satisfait ou remboursé : le client peut demander le remboursement intégral de son abonnement dans les {REFUND_DAYS} jours suivant la souscription, en nous écrivant. [À compléter : conditions précises (premier abonnement uniquement, traitement des packs déjà utilisés).]</p>
        <p>Le client consommateur dispose en outre d'un délai de quatorze jours pour se rétracter. Lorsqu'il demande l'exécution immédiate du service (création lancée avant la fin de ce délai) et reconnaît perdre ce droit une fois le service pleinement exécuté, la rétractation ne s'applique plus aux prestations déjà fournies.</p>
      </section>
      <section>
        <h2>7. Contenus du client et créations</h2>
        <p>Le client garantit disposer des droits sur les photos, textes, logos et marques qu'il importe. Il reste seul responsable des produits vendus et des informations publiées (allégations, prix, délais, avis). Le studio n'invente ni avis, ni chiffres, ni promesses : les informations à confirmer restent signalées « à compléter » et le client les vérifie avant publication.</p>
        <p>Les créations obtenues (marque, thème, images, vidéos, textes) appartiennent au client, qui peut les utiliser librement, y compris commercialement. Le studio peut ne pas garantir l'unicité d'un nom ou d'un logo proposé : il appartient au client d'en vérifier la disponibilité (marques déposées, noms de domaine) avant tout dépôt ou usage.</p>
      </section>
      <section>
        <h2>8. Publications et connexions</h2>
        <p>Les publications sur les réseaux sociaux et l'envoi vers une boutique ne partent qu'avec l'accord du client, via les autorisations officielles de chaque plateforme. Le client respecte les règles de ces plateformes.</p>
      </section>
      <section>
        <h2>9. Disponibilité et responsabilité</h2>
        <p>Le service est fourni avec soin, sans garantie de résultat commercial. Des interruptions ponctuelles peuvent survenir pour maintenance. La responsabilité de l'éditeur est limitée aux dommages directs et, au plus, aux sommes versées au cours des douze derniers mois, sauf faute lourde ou disposition légale contraire.</p>
      </section>
      <section>
        <h2>10. Données personnelles</h2>
        <p>Voir la <a href="/confidentialite">politique de confidentialité</a>.</p>
      </section>
      <section>
        <h2>11. Litiges</h2>
        <p>Ces conditions sont soumises au droit français. En cas de litige, le client consommateur peut recourir gratuitement au médiateur de la consommation : {COMPANY.mediator}. Il peut aussi utiliser la plateforme européenne de règlement en ligne des litiges.</p>
      </section>
      <section>
        <h2>12. Contact</h2>
        <p>{COMPANY.legalName}, {COMPANY.address}. {COMPANY.email}.</p>
      </section>
    </LegalPage>
  );
}
