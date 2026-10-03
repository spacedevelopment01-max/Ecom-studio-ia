import { LegalPage } from "@/components/legal-page";
import { COMPANY } from "@/lib/legal";

export const metadata = { title: "Politique de confidentialité" };

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité" intro="Nous collectons le minimum de données nécessaire au fonctionnement du studio, nous ne les vendons pas et vous pouvez les récupérer ou les supprimer à tout moment.">
      <section>
        <h2>Responsable du traitement</h2>
        <p>{COMPANY.legalName}, {COMPANY.address}. Contact : {COMPANY.email}.</p>
      </section>
      <section>
        <h2>Données traitées</h2>
        <ul>
          <li><strong>Compte</strong> : adresse e-mail, nom, mot de passe (stocké chiffré, jamais en clair).</li>
          <li><strong>Projets</strong> : photos et fichiers importés, informations produit, marque, textes, thèmes, images et vidéos créés.</li>
          <li><strong>Connexions</strong> : jetons d'autorisation des plateformes que vous connectez (réseaux sociaux, boutique), stockés chiffrés ; jamais vos mots de passe.</li>
          <li><strong>Facturation</strong> : historique d'abonnement et de crédits. Les données de carte sont traitées par le prestataire de paiement, pas par nous.</li>
          <li><strong>Technique</strong> : journaux nécessaires à la sécurité et au bon fonctionnement.</li>
        </ul>
      </section>
      <section>
        <h2>Finalités et bases légales</h2>
        <p>Fournir le service et le compte (exécution du contrat), facturer (obligation légale), sécuriser le service (intérêt légitime). Aucune publicité ciblée, aucune revente de données.</p>
      </section>
      <section>
        <h2>Sous-traitants</h2>
        <p>Pour fournir le service, certaines données sont transmises à : l'hébergeur du studio ; le prestataire de paiement (Stripe) ; les fournisseurs d'intelligence artificielle utilisés pour l'analyse, les textes, les images et les vidéos (Anthropic, OpenAI, Google, fal.ai selon les fonctions activées), qui reçoivent uniquement le contenu nécessaire à la génération demandée ; les plateformes que vous connectez vous-même. Certains de ces prestataires sont situés hors de l'Union européenne ; les transferts sont encadrés par les clauses contractuelles types de la Commission européenne ou un mécanisme équivalent.</p>
      </section>
      <section>
        <h2>Durées de conservation</h2>
        <p>Les données du compte et des projets sont conservées tant que le compte est actif, puis supprimées dans un délai de trente jours après sa fermeture, sauf obligation légale (pièces comptables : dix ans).</p>
      </section>
      <section>
        <h2>Vos droits</h2>
        <p>Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Écrivez à {COMPANY.email}. Vous pouvez aussi saisir la CNIL (cnil.fr).</p>
      </section>
    </LegalPage>
  );
}
