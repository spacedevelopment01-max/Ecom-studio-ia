import { INTRO_HTML } from "./intro-source";

/**
 * Insère l'intro (polices, style, écran #ecs-splash et son script, sans rien y changer) juste après <body>,
 * pendant la lecture de la page : elle couvre le site avant son premier affichage, quelle que soit la page d'arrivée.
 * Elle va dans un conteneur que React laisse tel quel (contenu vide côté React, sans contrôle à l'hydratation) :
 * insérée ailleurs dans <body>, React la verrait comme une différence et reconstruirait la page.
 * Un script ajouté via innerHTML ne s'exécute pas : il est recréé à l'identique pour être joué.
 * Une fois par visite : déjà vue (sessionStorage « ecsSeen »), rien n'est inséré (le script de l'intro ferait de même).
 */
const inject = `(function(){var d=document,b=d.getElementById('ecs-intro');if(!b||window.__ecsIntro||d.getElementById('ecs-splash'))return;window.__ecsIntro=1;
try{if(sessionStorage.getItem('ecsSeen'))return}catch(e){}
var t=d.createElement('template');t.innerHTML=${JSON.stringify(INTRO_HTML).replace(/</g, "\\u003c")};
t.content.querySelectorAll('script').forEach(function(s){var n=d.createElement('script');n.text=s.text;s.parentNode.replaceChild(n,s)});
b.insertBefore(t.content,b.firstChild)})();`;

export function IntroSplash() {
  return (
    <>
      <div id="ecs-intro" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />
      <script dangerouslySetInnerHTML={{ __html: inject }} />
    </>
  );
}
