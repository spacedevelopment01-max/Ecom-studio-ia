import Link from "next/link";
import { LogoMark } from "./logo";

export const INDEPENDENCE_NOTICE = "Allô Papiers est un service privé indépendant, non affilié à l'administration.";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-sand/60">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="font-display text-lg font-semibold">Allô Papiers</span>
          </div>
          <p className="mt-3 max-w-sm text-[0.95rem] text-muted">La paperasse en mode simplifié. Comprendre vos courriers, préparer vos réponses, suivre vos démarches.</p>
        </div>
        <nav aria-label="Informations" className="grid content-start gap-2 text-[0.95rem]">
          <Link className="hover:text-orange" href="/aide">Aide et questions fréquentes</Link>
          <Link className="hover:text-orange" href="/#tarifs">Tarifs</Link>
          <Link className="hover:text-orange" href="/orientation">Trouver France Services</Link>
          <Link className="hover:text-orange" href="/exemples/caf-justificatifs">Voir un exemple</Link>
          <Link className="hover:text-orange" href="/demonstrations">Démonstrations vidéo</Link>
        </nav>
        <nav aria-label="Mentions" className="grid content-start gap-2 text-[0.95rem]">
          <Link className="hover:text-orange" href="/mentions-legales">Mentions légales</Link>
          <Link className="hover:text-orange" href="/confidentialite">Confidentialité</Link>
          <Link className="hover:text-orange" href="/conditions">Conditions d'utilisation</Link>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-center text-[0.95rem] font-medium text-navy">{INDEPENDENCE_NOTICE}</p>
      </div>
    </footer>
  );
}
