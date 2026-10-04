import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { serverLang } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Cookies" };
}

export default async function Page() {
  const lang = await serverLang();
  if (lang === "en")
    return (
      <LegalPage title="Cookies" intro="This website uses no advertising cookies, no audience measurement tools and no third-party trackers. That's why no consent banner is shown.">
        <section>
          <h2>What is used</h2>
          <ul>
            <li><strong>ecs_session</strong>: session cookie, only after signing in to the studio, to keep you signed in (30 days at most). Strictly necessary.</li>
            <li><strong>ecs-theme</strong>: light or dark display preference, saved in your browser. No data is transmitted.</li>
            <li><strong>ecs-lang</strong>: interface language preference (French or English). Strictly necessary for display; no data is shared with third parties.</li>
          </ul>
        </section>
        <section>
          <h2>Your choices</h2>
          <p>You can delete these items at any time in your browser settings; you will then simply be signed out of the studio.</p>
        </section>
      </LegalPage>
    );
  return (
    <LegalPage title="Cookies" intro="Le site n'utilise ni cookie publicitaire, ni outil de mesure d'audience, ni traceur tiers. C'est pourquoi aucune bannière de consentement ne s'affiche.">
      <section>
        <h2>Ce qui est utilisé</h2>
        <ul>
          <li><strong>ecs_session</strong> : cookie de session, uniquement après connexion au studio, pour vous garder connecté (30 jours au plus). Strictement nécessaire.</li>
          <li><strong>ecs-theme</strong> : préférence d'affichage clair ou sombre, enregistrée dans votre navigateur. Aucune donnée n'est transmise.</li>
          <li><strong>ecs-lang</strong> : langue de l'interface choisie (français ou anglais). Nécessaire à l'affichage ; aucune donnée n'est transmise à des tiers.</li>
        </ul>
      </section>
      <section>
        <h2>Vos choix</h2>
        <p>Vous pouvez supprimer ces éléments à tout moment dans les réglages de votre navigateur ; vous serez alors simplement déconnecté du studio.</p>
      </section>
    </LegalPage>
  );
}
