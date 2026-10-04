import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { company } from "@/lib/legal";
import { pick } from "@/lib/i18n";
import { serverLang } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await serverLang();
  return { title: pick(lang, "Politique de confidentialité", "Privacy policy") };
}

export default async function Page() {
  const lang = await serverLang();
  const COMPANY = company(lang);
  if (lang === "en")
    return (
      <LegalPage title="Privacy policy" intro="We collect only the minimum data needed to run the studio, we never sell it, and you can retrieve or delete it at any time.">
        <section>
          <h2>Data controller</h2>
          <p>{COMPANY.legalName}, {COMPANY.address}. Contact: {COMPANY.email}.</p>
        </section>
        <section>
          <h2>Data processed</h2>
          <ul>
            <li><strong>Account</strong>: email address, name, password (stored encrypted, never in plain text).</li>
            <li><strong>Projects</strong>: uploaded photos and files, product information, brand, texts, themes, images and videos created.</li>
            <li><strong>Connections</strong>: authorization tokens for the platforms you connect (social networks, store), stored encrypted; never your passwords.</li>
            <li><strong>Billing</strong>: subscription and credit history. Card data is processed by the payment provider, not by us.</li>
            <li><strong>Technical</strong>: logs needed for security and proper operation.</li>
          </ul>
        </section>
        <section>
          <h2>Purposes and legal bases</h2>
          <p>Providing the service and the account (performance of the contract), billing (legal obligation), securing the service (legitimate interest). No targeted advertising, no resale of data.</p>
        </section>
        <section>
          <h2>Processors</h2>
          <p>To provide the service, some data is shared with: the studio's hosting provider; the payment provider (Stripe); the artificial intelligence providers used for analysis, texts, images and videos (Anthropic, OpenAI, Google, fal.ai depending on the features enabled), which receive only the content needed for the requested generation; the platforms you connect yourself. Some of these providers are located outside the European Union; transfers are governed by the European Commission's standard contractual clauses or an equivalent mechanism.</p>
        </section>
        <section>
          <h2>Retention periods</h2>
          <p>Account and project data is kept as long as the account is active, then deleted within thirty days of its closure, unless required by law (accounting records: ten years).</p>
        </section>
        <section>
          <h2>Your rights</h2>
          <p>You have the right to access, rectify, erase, restrict, object to and port your data. Write to {COMPANY.email}. You can also contact the CNIL, the French data protection authority (cnil.fr).</p>
        </section>
      </LegalPage>
    );
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
