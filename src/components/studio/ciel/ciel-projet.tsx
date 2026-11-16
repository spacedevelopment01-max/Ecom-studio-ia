"use client";
/**
 * La constellation du projet : sa porte d'entrée et son tableau de bord.
 *
 * Le projet est au milieu, un soleil aux couleurs de sa marque, avec une branche par étape. Chaque étoile est un vrai
 * bouton, avec son nom et son état toujours écrits : on clique pour entrer dans sa partie (ce qui existe vraiment : sa
 * fiche, sa marque, son angle), puis dans l'espace du Studio qui va avec. SINA est la lumière sur l'étoile où elle
 * travaille ; quand elle ne fait rien, elle reste au cœur. Rien ne se modifie ici : tout se demande à SINA.
 *
 * Pendant la création, cet écran se remplit en direct à côté de la conversation.
 */
import "./ciel.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Minus, Plus, RotateCcw, RotateCw, X } from "lucide-react";
import { useLang, useT } from "../../i18n";
import { useOptionalProject } from "../project-context";
import { navCtx, TABS, tabLabel } from "../shell";
import { spaceVisible } from "@/lib/studio-nav";
import type { DashboardData } from "@/lib/syna-agent/dashboard";
import type { CielProjetData } from "@/lib/ciel/ciel-projet";
import { formeDe } from "@/lib/ciel/forme";
import { ETAT_LIBELLE, placesDuCiel, vueDuProjet, type VueEtoile } from "@/lib/ciel/vue";
import { monterCiel, type Astre, type Ciel, type DonneesCiel } from "./moteur";
import { useHauteurCiel } from "./hauteur";

/** La constellation éteinte du prochain projet : toujours au même endroit, près du projet ouvert. */
const NOUVEAU = { id: "nouveau", x: 640, y: -330 };

export function CielProjet({ ciel, projectId, ouverte = null }: { ciel: CielProjetData; projectId: string; /** Étoile ouverte à l'arrivée (1 à 9). */ ouverte?: number | null }) {
  const t = useT(), { lang } = useLang(), router = useRouter();
  const { data, forme, voisins } = ciel;
  const projet = useOptionalProject()?.data ?? null;
  const taches = projet?.active ?? [];
  const tachesCle = taches.map((j) => `${j.type}:${j.status}:${j.label}`).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const vue = useMemo(() => vueDuProjet(data, taches), [data, tachesCle]);
  const [n, setN] = useState<number | null>(ouverte);
  const [leger, setLeger] = useState(false);
  const racine = useRef<HTMLElement>(null), moteur = useRef<Ciel | null>(null);

  // En direct : la page se relit seule pendant la construction (et à la fin de chaque réponse de SINA, par le fil).
  useEffect(() => {
    if (!data.building) return;
    const h = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(h);
  }, [router, data.building]);

  const donnees: DonneesCiel = useMemo(() => {
    const places = placesDuCiel(voisins.map((v) => v.id));
    const astres: Astre[] = [
      { id: projectId, type: "moi", x: 0, y: 0, couleurs: vue.couleurs, forme, etats: vue.etoiles.map((e) => e.etat) },
      { id: NOUVEAU.id, type: "nouveau", x: NOUVEAU.x, y: NOUVEAU.y, couleurs: null, forme: formeDe("nouveau projet"), etats: [] },
      ...voisins.map((v): Astre => ({ id: v.id, type: "mien", ...places[v.id], couleurs: v.couleurs, forme: v.forme, etats: v.etats })),
    ];
    return { astres, sina: vue.sina.etoile === null ? null : vue.sina.etoile - 1 };
  }, [projectId, vue, forme, voisins]);

  useHauteurCiel(racine);

  const premier = useRef(donnees);
  useEffect(() => {
    if (!racine.current) return;
    const c = monterCiel(racine.current, premier.current, { surLeger: setLeger });
    moteur.current = c;
    return () => { c.detruire(); moteur.current = null; };
  }, []);
  useEffect(() => { moteur.current?.maj(donnees); }, [donnees]);
  useEffect(() => { moteur.current?.ouvrir(n === null ? null : n - 1); }, [n]);
  useEffect(() => {
    if (n === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); fermer(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  const fermer = () => { const b = racine.current?.querySelector<HTMLElement>(`[data-etoile="${n}"]`); setN(null); requestAnimationFrame(() => b?.focus({ preventScroll: true })); };
  const etoile = n === null ? null : vue.etoiles.find((e) => e.n === n) ?? null;
  const etatDe = (e: VueEtoile) => (vue.sina.etoile === e.n && e.etat !== "avis" ? t("SINA y travaille", "SINA is working here") : t(ETAT_LIBELLE[e.etat].fr, ETAT_LIBELLE[e.etat].en));
  const faites = vue.etoiles.filter((e) => e.etat === "fait").length;

  return (
    <section ref={racine} className="ciel" data-ciel data-dashboard data-building={data.building ? "1" : "0"} data-leger={leger ? "" : undefined} data-ouvert={n !== null ? "" : undefined} aria-label={t(`La constellation de ${vue.nom}`, `The constellation of ${vue.nom}`)}>
      <canvas aria-hidden="true" />

      <header className="ciel-titre">
        <p>{data.building ? <><i aria-hidden />{t("Ton projet, en direct", "Your project, live")}</> : t("Ton projet", "Your project")}</p>
        <h2>{vue.nom}</h2>
        <p className="ciel-compte" role="img" aria-label={t(`${faites} étape${faites > 1 ? "s" : ""} validée${faites > 1 ? "s" : ""} sur ${vue.etoiles.length}`, `${faites} of ${vue.etoiles.length} steps approved`)}>
          {!data.started ? t("Rien n'a encore commencé", "Nothing has started yet") : vue.etoiles.every((e) => e.etat === "fait" || e.etat === "sans") ? t("Toutes tes étoiles sont allumées", "All your stars are lit") : <>{t("Étape", "Step")} {data.current} {t("sur", "of")} {vue.etoiles.length}</>}
        </p>
      </header>

      {/* Les neuf étoiles : de vrais boutons, que le ciel pose sur le dessin. Sans le dessin, il reste cette liste. */}
      <ol className="ciel-etoiles" aria-label={t("Les étapes de ton projet", "Your project steps")}>
        {vue.etoiles.map((e) => (
          <li key={e.n}>
            <button type="button" className="ciel-etoile" data-etoile={e.n} data-step={e.n} data-etat={e.etat} data-ici={vue.sina.etoile === e.n ? "" : undefined} aria-current={data.started && e.n === data.current ? "step" : undefined} aria-expanded={n === e.n} aria-controls="ciel-volet" onClick={() => setN(n === e.n ? null : e.n)}>
              <span><b>{t(e.fr, e.en)}</b><small>{etatDe(e)}</small></span>
            </button>
          </li>
        ))}
      </ol>

      {/* Les noms des constellations : la mienne, celle à allumer, mes autres projets. */}
      <div className="ciel-astres">
        <button type="button" className="ciel-astre" data-astre={projectId} data-type="moi" onClick={() => moteur.current?.cadrer("moi")}><span>{vue.nom}<small>{t("Mon projet", "My project")}</small></span></button>
        <Link className="ciel-astre" data-astre={NOUVEAU.id} data-type="nouveau" href="/studio?nouveau=1"><span>{t("Nouveau projet", "New project")}<small>{t("Clique pour l'allumer", "Click to light it up")}</small></span></Link>
        {voisins.map((v) => <Link key={v.id} className="ciel-astre" data-astre={v.id} data-type="mien" href={`/studio/${v.id}/pilote`}><span>{v.nom}<small>{t("Mon projet", "My project")}</small></span></Link>)}
      </div>

      {vue.sina.phrase && <p className="ciel-dit" aria-live="polite"><em>Sina</em><span key={vue.sina.phrase.fr}>{t(vue.sina.phrase.fr, vue.sina.phrase.en)}</span></p>}

      <div className="ciel-vue" role="group" aria-label={t("Vue du ciel", "Sky view")}>
        <button type="button" onClick={() => moteur.current?.zoom(1.4)} aria-label={t("Zoomer", "Zoom in")} title={t("Zoomer", "Zoom in")}><Plus aria-hidden /></button>
        <button type="button" onClick={() => moteur.current?.zoom(1 / 1.4)} aria-label={t("Dézoomer", "Zoom out")} title={t("Dézoomer", "Zoom out")}><Minus aria-hidden /></button>
        <button type="button" data-pivot onClick={() => moteur.current?.tourner(-Math.PI / 8)} aria-label={t("Pivoter vers la gauche", "Rotate left")} title={t("Pivoter vers la gauche", "Rotate left")}><RotateCcw aria-hidden /></button>
        <button type="button" data-pivot onClick={() => moteur.current?.tourner(Math.PI / 8)} aria-label={t("Pivoter vers la droite", "Rotate right")} title={t("Pivoter vers la droite", "Rotate right")}><RotateCw aria-hidden /></button>
        <button type="button" className="ciel-vue-t" onClick={() => { setN(null); moteur.current?.cadrer("moi"); }}>{t("Mon projet", "My project")}</button>
        {voisins.length > 0 && <button type="button" className="ciel-vue-t" onClick={() => { setN(null); moteur.current?.cadrer("tout"); }}>{t("Tout mon ciel", "My whole sky")}</button>}
      </div>
      <p className="ciel-aide" aria-hidden="true"><span className="ciel-aide-o">{t("Glisse pour te promener, molette pour zoomer, Maj et glisser pour pivoter", "Drag to wander, scroll to zoom, Shift and drag to rotate")}</span><span className="ciel-aide-t">{t("Glisse pour te promener, pince pour zoomer et pivoter", "Drag to wander, pinch to zoom and rotate")}</span></p>

      <aside id="ciel-volet" className="ciel-volet" data-volet aria-live="polite" aria-label={etoile ? t(etoile.fr, etoile.en) : undefined} hidden={!etoile}>
        {etoile && (
          <>
            <button type="button" className="ciel-fermer" onClick={fermer}><X aria-hidden />{t("Retour au ciel", "Back to the sky")}</button>
            <p className="ciel-etat" data-etat={etoile.etat}>{etatDe(etoile)}</p>
            <h3>{t(etoile.fr, etoile.en)}</h3>
            <Partie etoile={etoile} data={data} projectId={projectId} business={projet?.business} lang={lang} visible={(id) => !projet || spaceVisible(id as never, navCtx(projet))} />
            {data.building && <p className="ciel-note">{t("Pour changer quelque chose, demande-le à SINA dans la conversation.", "To change something, ask SINA in the conversation.")}</p>}
          </>
        )}
      </aside>
    </section>
  );
}

/** Ce qu'il y a dans une étoile : seulement ce qui existe vraiment ; sinon, ce que l'étape apportera. */
function Partie({ etoile, data, projectId, business, lang, visible }: { etoile: VueEtoile; data: DashboardData; projectId: string; business?: "products" | "services"; lang: "fr" | "en"; visible: (id: string) => boolean }) {
  const t = useT();
  const fiche = etoile.n === 1 && data.fiche.length + data.notes.length > 0;
  const marque = etoile.n === 2 ? data.brand : null, angle = etoile.n === 3 ? data.angle : null;
  const tab = etoile.espace ? TABS.find((x) => x.id === etoile.espace) : null;
  const ouvre = tab && etoile.etat !== "avenir" && etoile.etat !== "sans" && visible(tab.id);
  return (
    <>
      {(!fiche && !marque && !angle) && <p className="ciel-promesse">{t(etoile.promesse.fr, etoile.promesse.en)}</p>}
      {fiche && (
        <div className="ciel-bloc" data-dashboard-fiche>
          <p className="ciel-bloc-t">{t("Ce que tu as dit à SINA", "What you told SINA")}</p>
          <dl>
            {data.fiche.map((f) => <div key={f.fr}><dt>{t(f.fr, f.en)}</dt><dd data-plus-tard={f.later ? "" : undefined}>{f.value}</dd></div>)}
            {data.notes.map((x, i) => <div key={`n${i}`} data-dashboard-note><dt>{x.sujet}</dt><dd>{x.value}</dd></div>)}
            {data.mode === "refonte" && !!data.keep.length && <div><dt>{t("Gardé tel quel", "Kept as is")}</dt><dd>{data.keep.join(", ")}</dd></div>}
          </dl>
        </div>
      )}
      {marque && (
        <div className="ciel-bloc ciel-marque" data-dashboard-brand>
          {marque.logo && <img src={marque.logo} alt={t("Ton logo", "Your logo")} />}
          <div>
            {marque.name && <p className="ciel-mot">{marque.name}</p>}
            {marque.slogan && <p>{marque.slogan}</p>}
            {!!marque.colors.length && <div className="ciel-nuancier" role="img" aria-label={t("Tes couleurs", "Your colours")}>{marque.colors.map((c, i) => <i key={`${c}${i}`} style={{ background: c }} />)}</div>}
          </div>
        </div>
      )}
      {angle && (
        <div className="ciel-bloc" data-dashboard-angle>
          <p className="ciel-bloc-t">{t("L'angle que tu as choisi", "The angle you chose")}</p>
          <p className="ciel-mot">{angle.title}</p>
          {angle.promise && <p>{angle.promise}</p>}
        </div>
      )}
      {ouvre && tab && <Link className="ciel-bouton" href={`/studio/${projectId}/${tab.id}`}>{t("Ouvrir l'espace", "Open")} {tabLabel(tab, lang, business)}<ArrowRight aria-hidden /></Link>}
    </>
  );
}
