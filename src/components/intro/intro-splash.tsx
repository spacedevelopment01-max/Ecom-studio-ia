import { INTRO_HTML } from "./intro-source";

/** Textes anglais de l'intro (le fichier fourni est en français). */
export const INTRO_EN = { label: "ECOM STUDIO IA, the all-in-one e-commerce platform", sub: "The all-in-one e-commerce platform", skip: "Skip" };

/**
 * Insère l'intro (polices, style, écran #ecs-splash et son script, sans rien y changer) juste après <body>,
 * pendant la lecture de la page : elle couvre le site avant son premier affichage, quelle que soit la page d'arrivée.
 * Elle va dans un conteneur que React laisse tel quel (contenu vide côté React, sans contrôle à l'hydratation) :
 * insérée ailleurs dans <body>, React la verrait comme une différence et reconstruirait la page.
 * Un script ajouté via innerHTML ne s'exécute pas : il est recréé à l'identique pour être joué.
 * Interface en anglais : les trois textes de l'intro (sous-titre, bouton « Passer », nom lu par les lecteurs d'écran)
 * sont remplacés à l'insertion, le fichier fourni restant identique.
 * Une fois par visite : déjà vue (sessionStorage « ecsSeen »), rien n'est inséré (le script de l'intro ferait de même).
 */
const inject = `(function(){var d=document,b=d.getElementById('ecs-intro');if(!b||window.__ecsIntro||d.getElementById('ecs-splash'))return;window.__ecsIntro=1;
try{if(sessionStorage.getItem('ecsSeen'))return}catch(e){}
var t=d.createElement('template');t.innerHTML=${JSON.stringify(INTRO_HTML).replace(/</g, "\\u003c")};
t.content.querySelectorAll('script').forEach(function(s){var n=d.createElement('script');n.text=s.text;s.parentNode.replaceChild(n,s)});
if(d.documentElement.lang==='en'){var c=t.content,q=function(x){return c.querySelector(x)},e=q('#ecs-splash'),u=q('.ecs-sub'),k=q('.ecs-skip');if(e)e.setAttribute('aria-label',${JSON.stringify(INTRO_EN.label)});if(u)u.textContent=${JSON.stringify(INTRO_EN.sub)};if(k)k.textContent=${JSON.stringify(INTRO_EN.skip)}}
b.insertBefore(t.content,b.firstChild)})();`;

export function IntroSplash() {
  return (
    <>
      <div id="ecs-intro" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />
      <script dangerouslySetInnerHTML={{ __html: inject }} />
    </>
  );
}
