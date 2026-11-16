"use client";
/**
 * L'accueil du Studio : la voie lactée. On y arrive de loin, juste après la connexion.
 *
 * Le nouveau client n'y voit qu'une chose : la constellation « Nouveau projet », encore éteinte, avec le nom de ses
 * neuf étoiles. Une visite guidée l'accueille (une fois, et à la demande) : la constellation s'allume étoile par étoile
 * pour montrer ce qui l'attend, puis s'éteint ; il clique dessus pour lancer son projet. Les phrases de la visite sont
 * écrites ici une fois pour toutes : aucun appel à l'IA.
 *
 * Le client qui a déjà des projets voit leurs constellations autour de « Nouveau projet » ; un clic entre dans un projet.
 */
import "./ciel.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, RotateCw } from "lucide-react";
import { useT } from "../../i18n";
import { formeDe, type Forme } from "@/lib/ciel/forme";
import { placesAccueil, soleilDe, type EtatEtoile } from "@/lib/ciel/vue";
import { monterCiel, type Astre, type Ciel, type DonneesCiel } from "./moteur";
import { useHauteurCiel } from "./hauteur";
import { ETOILES, VISITE } from "@/lib/ciel/visite";

export type ProjetDuCiel = { id: string; nom: string; palette: string[]; forme: Forme; etats: EtatEtoile[] };

const CLE_VISITE = "ecs-ciel-visite";
const NOUVEAU = "nouveau";

export function CielAccueil({ projets, onNouveau }: { projets: ProjetDuCiel[]; /** Lance la création d'un projet (le chemin habituel : forfait si besoin, puis SINA). */ onNouveau: () => void }) {
  const t = useT();
  const seul = projets.length === 0;
  const racine = useRef<HTMLElement>(null), moteur = useRef<Ciel | null>(null);
  const [leger, setLeger] = useState(false);
  // La visite : l'arrêt en cours (null : pas de visite) et le nombre d'étoiles allumées, une à une, pour la démonstration.
  const [arret, setArret] = useState<number | null>(null);
  const [allumees, setAllumees] = useState(0);
  useHauteurCiel(racine);

  // La visite accueille le nouveau client une seule fois ; il peut la revoir quand il veut.
  useEffect(() => {
    if (!seul) return;
    let vue: string | null = null;
    try { vue = localStorage.getItem(CLE_VISITE); } catch {}
    if (vue) return;
    const h = setTimeout(() => setArret(0), 2400);
    return () => clearTimeout(h);
  }, [seul]);
  const cible = arret === null ? 0 : VISITE[arret].allumees;
  useEffect(() => {
    if (allumees === cible) return;
    if (cible < allumees) { setAllumees(cible); return; }
    const h = setTimeout(() => setAllumees((n) => Math.min(cible, n + 1)), 520);
    return () => clearTimeout(h);
  }, [allumees, cible]);
  const finir = () => { setArret(null); try { localStorage.setItem(CLE_VISITE, "1"); } catch {} };
  const suivant = () => (arret !== null && arret < VISITE.length - 1 ? setArret(arret + 1) : finir());

  const donnees: DonneesCiel = useMemo(() => {
    const places = placesAccueil(projets.map((p) => p.id));
    const etats: EtatEtoile[] = ETOILES.map((_, i) => (i < allumees ? "fait" : "avenir"));
    const astres: Astre[] = [
      { id: NOUVEAU, type: "nouveau", x: 0, y: 0, couleurs: null, forme: formeDe("nouveau projet"), etats: seul ? etats : [], grand: seul },
      ...projets.map((p): Astre => ({ id: p.id, type: "mien", ...places[p.id], couleurs: soleilDe(p.palette), forme: p.forme, etats: p.etats })),
    ];
    // Pendant la démonstration, la lumière de SINA va sur l'étoile qu'elle vient d'allumer.
    return { astres, sina: seul && allumees > 0 ? allumees - 1 : null };
  }, [projets, seul, allumees]);

  const premier = useRef(donnees);
  // Le ciel est remonté quand le nombre de projets change (un premier projet créé, un projet supprimé).
  useEffect(() => {
    if (!racine.current) return;
    const c = monterCiel(racine.current, premier.current, { surLeger: setLeger, arrivee: true });
    moteur.current = c;
    return () => { c.detruire(); moteur.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projets.length]);
  premier.current = donnees;
  useEffect(() => { moteur.current?.maj(donnees); }, [donnees]);

  const etat = (i: number) => (i < allumees ? t("Exemple", "Example") : t("À allumer", "To light up"));
  const resume = (p: ProjetDuCiel) => { const n = p.etats.filter((e) => e === "fait").length; return n >= p.etats.length && n > 0 ? t("Toutes ses étoiles sont allumées", "All its stars are lit") : t(`${n} étoile${n > 1 ? "s" : ""} allumée${n > 1 ? "s" : ""} sur 9`, `${n} of 9 stars lit`); };

  return (
    <section ref={racine} className="ciel ciel-accueil" data-ciel data-accueil={seul ? "nouveau" : "projets"} data-leger={leger ? "" : undefined} data-visite={arret !== null ? "" : undefined} aria-label={t("Ton ciel", "Your sky")}>
      <canvas aria-hidden="true" />

      <header className="ciel-titre">
        <p>{t("Ton ciel", "Your sky")}</p>
        <h2>{seul ? t("Ta constellation t'attend", "Your constellation awaits") : t("Tes constellations", "Your constellations")}</h2>
        <p className="ciel-compte">{seul ? t("Elle s'allume dès que tu lances ton projet", "It lights up as soon as you start your project") : t(`${projets.length} projet${projets.length > 1 ? "s" : ""}`, `${projets.length} project${projets.length > 1 ? "s" : ""}`)}</p>
      </header>

      {/* Le nouveau client lit déjà le nom des neuf étoiles de son futur projet ; chacune lance la création. */}
      {seul && (
        <ol className="ciel-etoiles" aria-label={t("Les neuf étoiles de ton futur projet", "The nine stars of your future project")}>
          {ETOILES.map(([fr, en], i) => (
            <li key={fr}>
              <button type="button" className="ciel-etoile" data-etoile={i + 1} data-etat={i < allumees ? "fait" : "avenir"} data-exemple={i < allumees ? "" : undefined} onClick={onNouveau} tabIndex={-1}>
                <span><b>{t(fr, en)}</b><small>{etat(i)}</small></span>
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="ciel-astres">
        <button type="button" className="ciel-coeur" data-coeur={NOUVEAU} onClick={onNouveau} aria-label={t("Nouveau projet : clique pour l'allumer", "New project: click to light it up")} />
        <button type="button" className="ciel-astre" data-astre={NOUVEAU} data-type="nouveau" data-appel={seul ? "" : undefined} onClick={onNouveau}><span>{t("Nouveau projet", "New project")}<small>{t("Clique pour l'allumer", "Click to light it up")}</small></span></button>
        {projets.map((p) => (
          <span key={p.id}>
            <Link className="ciel-coeur" data-coeur={p.id} href={`/studio/${p.id}/pilote`} aria-hidden="true" tabIndex={-1} />
            <Link className="ciel-astre" data-astre={p.id} data-type="mien" href={`/studio/${p.id}/pilote`}><span>{p.nom}<small>{resume(p)}</small></span></Link>
          </span>
        ))}
      </div>

      {arret !== null ? (
        <div className="ciel-visite" role="dialog" aria-label={t("Visite guidée", "Guided tour")} aria-live="polite">
          <p><em>Sina</em><span key={arret}>{t(VISITE[arret].fr, VISITE[arret].en)}</span></p>
          <div>
            <span className="ciel-visite-pas" aria-label={t(`Arrêt ${arret + 1} sur ${VISITE.length}`, `Stop ${arret + 1} of ${VISITE.length}`)}>{VISITE.map((_, i) => <i key={i} data-ici={i === arret ? "" : undefined} />)}</span>
            {arret < VISITE.length - 1 && <button type="button" className="ciel-visite-passer" onClick={finir}>{t("Passer la visite", "Skip the tour")}</button>}
            {arret < VISITE.length - 1
              ? <button type="button" className="ciel-bouton" onClick={suivant} autoFocus>{t("Suivant", "Next")}</button>
              : <button type="button" className="ciel-bouton" onClick={() => { finir(); onNouveau(); }} autoFocus>{t("Allumer ma constellation", "Light up my constellation")}</button>}
          </div>
        </div>
      ) : seul ? (
        <p className="ciel-dit"><em>Sina</em><span>{t("Clique sur « Nouveau projet » pour allumer ta constellation.", "Click “New project” to light up your constellation.")}</span></p>
      ) : null}

      <div className="ciel-vue" role="group" aria-label={t("Vue du ciel", "Sky view")}>
        <button type="button" onClick={() => moteur.current?.zoom(1.4)} aria-label={t("Zoomer", "Zoom in")} title={t("Zoomer", "Zoom in")}><Plus aria-hidden /></button>
        <button type="button" onClick={() => moteur.current?.zoom(1 / 1.4)} aria-label={t("Dézoomer", "Zoom out")} title={t("Dézoomer", "Zoom out")}><Minus aria-hidden /></button>
        <button type="button" data-pivot onClick={() => moteur.current?.tourner(-Math.PI / 8)} aria-label={t("Pivoter vers la gauche", "Rotate left")} title={t("Pivoter vers la gauche", "Rotate left")}><RotateCcw aria-hidden /></button>
        <button type="button" data-pivot onClick={() => moteur.current?.tourner(Math.PI / 8)} aria-label={t("Pivoter vers la droite", "Rotate right")} title={t("Pivoter vers la droite", "Rotate right")}><RotateCw aria-hidden /></button>
        <button type="button" className="ciel-vue-t" onClick={() => moteur.current?.cadrer("tout")}>{seul ? t("Recentrer", "Recentre") : t("Tout mon ciel", "My whole sky")}</button>
        {seul && arret === null && <button type="button" className="ciel-vue-t" onClick={() => { moteur.current?.cadrer("tout"); setArret(0); }}>{t("Revoir la visite", "Replay the tour")}</button>}
      </div>
    </section>
  );
}
