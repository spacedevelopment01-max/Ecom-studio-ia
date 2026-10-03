import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Cookies" };

export default function Page() {
  return (
    <LegalPage title="Cookies" intro="Le site n'utilise ni cookie publicitaire, ni outil de mesure d'audience, ni traceur tiers. C'est pourquoi aucune bannière de consentement ne s'affiche.">
      <section>
        <h2>Ce qui est utilisé</h2>
        <ul>
          <li><strong>ecs_session</strong> : cookie de session, uniquement après connexion au studio, pour vous garder connecté (30 jours au plus). Strictement nécessaire.</li>
          <li><strong>ecs-theme</strong> : préférence d'affichage clair ou sombre, enregistrée dans votre navigateur. Aucune donnée n'est transmise.</li>
        </ul>
      </section>
      <section>
        <h2>Vos choix</h2>
        <p>Vous pouvez supprimer ces éléments à tout moment dans les réglages de votre navigateur ; vous serez alors simplement déconnecté du studio.</p>
      </section>
    </LegalPage>
  );
}
