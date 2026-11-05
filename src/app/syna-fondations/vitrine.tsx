"use client";
/**
 * Vitrine interne des fondations SYNA (mission #282, lot 0). Données d'exemple, aucun appel, aucun stockage :
 * les réglages ne vivent que dans cette page. Sert aux captures et au contrôle visuel des deux présentations.
 */
import "@/components/syna/syna.css";
import "./vitrine.css";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  SynaActionCard, SynaButton, SynaComposer, SynaCostMeter, SynaCostQuote, SynaMessage, SynaScope, SynaSelectionChip,
  SynaShell, SynaStateBadge, SynaTrigger, SYNA_STATES, stateLabel,
} from "@/components/syna";
import { resolveSynaPrefs, type SynaUiPrefs } from "@/lib/syna-ui/preferences";
import { SYNA_ACCENT_SETS, SYNA_PALETTES, contrastChecks, contrastRatio, type SynaScheme } from "@/lib/syna-ui/tokens";
import type { SynaVitrineState } from "@/lib/syna-ui/vitrine";

type Lang = "fr" | "en";
const IMG = "/theme-assets/sillon/v2-03-machine-pierre-claire.webp";

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: ReactNode; aria?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="sv-ctl">
      <span className="sv-ctl-l" aria-hidden="true">{label}</span>
      <div className="sv-seg" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} aria-label={o.aria} onClick={() => onChange(o.id)}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function Section({ id, eyebrow, title, intro, children }: { id: string; eyebrow: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="sv-sec" aria-labelledby={`${id}-t`} id={id}>
      <header className="sv-sec-h">
        <p className="sy-eyebrow">{eyebrow}</p>
        <h2 id={`${id}-t`} className="sy-title">{title}</h2>
        {intro ? <p className="sy-body sv-intro">{intro}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function SynaVitrine({ initial }: { initial: SynaVitrineState }) {
  const [prefs, setPrefs] = useState<Partial<SynaUiPrefs>>(() => {
    const { view: _v, lang: _l, ...p } = initial;
    return p;
  });
  const [lang, setLang] = useState<Lang>(initial.lang ?? "fr");
  const [view, setView] = useState<"conversation" | "workspace">(initial.view ?? "workspace");
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState(true);
  const resolved = resolveSynaPrefs(undefined, prefs);
  const set = <K extends keyof SynaUiPrefs>(k: K, v: SynaUiPrefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));
  const L = (fr: string, en: string) => (lang === "en" ? en : fr);

  // « Auto » suit le Studio (thème choisi, sinon l'appareil) : les valeurs affichées suivent le même calcul que syna.css.
  const [autoDark, setAutoDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const read = () => { const t = document.documentElement.dataset.theme; setAutoDark(t === "dark" || (t !== "light" && mq.matches)); };
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  const scheme: SynaScheme = resolved.appearance === "dark" || (resolved.appearance === "auto" && autoDark) ? "dark" : "light";
  const checks = useMemo(() => contrastChecks().filter((c) => c.mode === resolved.mode && c.accent === resolved.accent), [resolved.mode, resolved.accent]);
  const minText = Math.min(...checks.filter((c) => c.min === 4.5).map((c) => c.ratio));
  const minUi = Math.min(...checks.filter((c) => c.min === 3).map((c) => c.ratio));
  const palette = SYNA_PALETTES[resolved.mode][scheme], accent = SYNA_ACCENT_SETS[resolved.accent][scheme];
  const ratio = (fg: string, bg: string) => contrastRatio(fg, bg).toFixed(1).replace(".", lang === "en" ? "." : ",");

  const chip = selected ? (
    <SynaSelectionChip kind={L("Section", "Section")} name={L("En-tête", "Header")} where={L("Accueil", "Home")} onClear={() => setSelected(false)} lang={lang} />
  ) : null;

  const runningCard = (
    <SynaActionCard
      lang={lang}
      eyebrow={L("Images · SILLON", "Images · SILLON")}
      title={L("3 images · finition Cuivre", "3 images · Copper finish")}
      state="running"
      stateDetail="2/3"
      progress="indeterminate"
      steps={[
        { title: L("Table en pierre, lumière du matin", "Stone table, morning light"), detail: L("Contrôle : produit entier, aucune lettre ajoutée", "Check: whole product, no added lettering"), state: "verified" },
        { title: L("Gros plan sur la ceinture cuivrée", "Close-up of the copper band"), detail: L("Le fournisseur n'a pas répondu (erreur 503). Résultat incertain : rien n'est relancé sans votre accord.", "The provider did not answer (error 503). Uncertain result: nothing is retried without your consent."), state: "failed" },
        { title: L("Machine et tasse, fond clair", "Machine and cup, light background"), detail: L("Création en cours…", "Creating…"), state: "running" },
      ]}
      note={L("Exemple. Débité à ce stade : 2 %. Image 2 non débitée tant que le fournisseur ne confirme pas.", "Example. Charged so far: 2%. Image 2 is not charged until the provider confirms.")}
      actions={<><SynaButton variant="ghost" size="sm">{L("Arrêter après l'image 3", "Stop after image 3")}</SynaButton><SynaButton size="sm">{L("Relancer l'image 2 · ≈ 2 %", "Retry image 2 · ≈ 2%")}</SynaButton></>}
    />
  );

  const shell = (
    <SynaShell
      lang={lang}
      panel={resolved.panel}
      mobileView={view}
      conversationId="sv-convo"
      rail={<SynaTrigger variant="rail" expanded={false} status="notice" statusText={L("1 image prête", "1 image ready")} lang={lang} onActivate={() => set("panel", "pinned")} />}
      conversation={{
        header: (
          <>
            <span className="sv-mark"><span className="sy-wordmark">Syna</span><span className="sy-small">{L("mémoire du projet · 14 éléments", "project memory · 14 items")}</span></span>
            <SynaButton variant="ghost" size="sm" onClick={() => set("panel", "collapsed")} aria-controls="sv-convo" aria-expanded={true}>{L("Replier", "Collapse")}</SynaButton>
          </>
        ),
        thread: (
          <>
            <SynaMessage from="user" lang={lang}><p>{L("Crée 3 images de la finition Cuivre sur une table en pierre, sans personne.", "Create 3 images of the Copper finish on a stone table, no people.")}</p></SynaMessage>
            <SynaMessage from="syna" lang={lang}><p>{L("Je prépare trois images à partir de votre photo du produit. Je vérifie chacune avant de vous la montrer.", "I am preparing three images from your product photo. I check each one before showing it to you.")}</p></SynaMessage>
            {runningCard}
          </>
        ),
        footer: <SynaComposer value={draft} onChange={setDraft} selection={chip} lang={lang} />,
      }}
      workspace={{
        label: L("Aperçu du site", "Site preview"),
        header: (
          <>
            <span className="sv-crumb"><b>{L("Site · Accueil", "Site · Home")}</b><span className="sy-small">{L("version 12 · exemple", "version 12 · example")}</span></span>
            <SynaCostMeter remainingPct={54} lang={lang} />
          </>
        ),
        stage: (
          <figure className="sv-preview">
            <img src={IMG} alt={L("Machine à espresso SILLON sur une pierre claire (image de démonstration).", "SILLON espresso machine on a light stone (demo image).")} />
            {selected ? <span className="sv-outline" aria-hidden="true"><i>{L("En-tête", "Header")}</i></span> : null}
          </figure>
        ),
      }}
      commandBar={<SynaTrigger variant="commandbar" expanded={resolved.panel === "pinned"} status="working" statusText={L("Création de 3 images · 2 sur 3", "Creating 3 images · 2 of 3")} lang={lang} onActivate={() => set("panel", resolved.panel === "pinned" ? "collapsed" : "pinned")} />}
      tabbar={
        <>
          <SynaTrigger variant="tab" current={view === "conversation"} expanded={view === "conversation"} status="working" lang={lang} onActivate={() => setView("conversation")} />
          <button type="button" className="sv-tab" aria-current={view === "workspace" ? "page" : undefined} onClick={() => setView("workspace")}>{L("Aperçu", "Preview")}</button>
          <button type="button" className="sv-tab">{L("Espaces", "Spaces")}</button>
          <button type="button" className="sv-tab">{L("Suivi", "Tasks")}</button>
        </>
      }
    />
  );

  return (
    <SynaScope prefs={resolved} lang={lang} className="sv-page">
      <div className="sv-wrap">
        <header className="sv-head">
          <div className="sv-head-t">
            <p className="sy-eyebrow">{L("E-com Studio · mission #282 · lot 0", "E-com Studio · mission #282 · lot 0")}</p>
            <h1 className="sy-title sv-h1">{L("Fondations SYNA", "SYNA foundations")} <em>{resolved.mode === "encre" ? "Encre" : L("Plein cadre", "Full frame")}</em></h1>
            <p className="sy-body sv-intro">{L(
              "Vitrine interne : les composants du futur Studio, dans les deux présentations. Aucun écran actuel ne les utilise encore. Données d'exemple, aucun appel, aucun coût.",
              "Internal showcase: the future Studio's components, in both presentations. No current screen uses them yet. Example data, no calls, no cost.",
            )}</p>
          </div>
          <div className="sv-ctls">
            <Seg label={L("Mode", "Mode")} value={resolved.mode} onChange={(v) => setPrefs((p) => ({ ...p, mode: v, accent: null, convoWidth: null }))} options={[{ id: "encre", label: "Encre" }, { id: "plein", label: L("Plein cadre", "Full frame") }]} />
            <Seg label={L("Apparence", "Appearance")} value={resolved.appearance} onChange={(v) => set("appearance", v)} options={[{ id: "auto", label: L("Auto", "Auto") }, { id: "light", label: L("Clair", "Light") }, { id: "dark", label: L("Sombre", "Dark") }]} />
            <Seg label={L("Bleu", "Blue")} value={resolved.accent} onChange={(v) => set("accent", v)} options={(["encre", "cobalt", "prusse"] as const).map((a) => ({ id: a, aria: { encre: L("Bleu d'encre", "Ink blue"), cobalt: "Cobalt", prusse: L("Bleu de Prusse", "Prussian blue") }[a], label: <span className="sv-sw" style={{ background: SYNA_ACCENT_SETS[a][scheme].accent }} /> }))} />
            <Seg label={L("Densité", "Density")} value={resolved.density} onChange={(v) => set("density", v)} options={[{ id: "comfortable", label: L("Confortable", "Comfortable") }, { id: "compact", label: L("Compacte", "Compact") }]} />
            <Seg label={L("Texte", "Text")} value={resolved.textSize} onChange={(v) => set("textSize", v)} options={[{ id: "normal", label: L("Normal", "Normal") }, { id: "large", label: L("Grand", "Large") }]} />
            <Seg label={L("Langue", "Language")} value={lang} onChange={setLang} options={[{ id: "fr", label: "FR" }, { id: "en", label: "EN" }]} />
          </div>
        </header>

        <Section id="sv-shell" eyebrow="01" title={L("Coquille : conversation et espace de travail", "Shell: conversation and workspace")} intro={L(
          "Le même contenu dans les deux présentations. Changez de mode : le brouillon tapé, l'élément désigné et la tâche restent en place.",
          "The same content in both presentations. Switch modes: the typed draft, the selected element and the task stay in place.",
        )}>
          <div className="sv-shell-tools">
            <SynaButton size="sm" onClick={() => set("panel", resolved.panel === "pinned" ? "collapsed" : "pinned")} aria-pressed={resolved.panel === "collapsed"}>{resolved.panel === "pinned" ? L("Replier Syna", "Collapse Syna") : L("Épingler Syna", "Pin Syna")}</SynaButton>
            <SynaButton size="sm" variant="ghost" onClick={() => setView(view === "workspace" ? "conversation" : "workspace")}>{L("Téléphone : ", "Phone: ")}{view === "workspace" ? L("voir la conversation", "show conversation") : L("voir l'aperçu", "show preview")}</SynaButton>
            {!selected ? <SynaButton size="sm" variant="ghost" onClick={() => setSelected(true)}>{L("Désigner l'en-tête", "Select the header")}</SynaButton> : null}
          </div>
          <div className="sv-shell-box">{shell}</div>
        </Section>

        <Section id="sv-states" eyebrow="02" title={L("Un seul vocabulaire d'états", "One state vocabulary")} intro={L("Chaque état a son mot et son icône : la couleur n'est jamais le seul signal.", "Each state has its word and icon: colour is never the only signal.")}>
          <ul className="sv-states">
            {SYNA_STATES.map((s) => (
              <li key={s}>
                <SynaStateBadge state={s} lang={lang} />
                <span className="sy-small">{{
                  proposal: L("Proposé par Syna, rien n'est lancé", "Suggested by Syna, nothing started"),
                  draft: L("Préparé, modifiable, pas publié", "Prepared, editable, not published"),
                  confirmed: L("Accepté, en attente d'exécution", "Accepted, waiting to run"),
                  running: L("En train de se faire", "Being done"),
                  verified: L("Fait et contrôlé", "Done and checked"),
                  failed: L("Raté, dit clairement", "Failed, said plainly"),
                  unavailable: L("Pas encore possible ici", "Not possible here yet"),
                }[s]}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="sv-cards" eyebrow="03" title={L("Cartes de tâche et d'action", "Task and action cards")}>
          <div className="sv-grid2">
            {runningCard}
            <SynaActionCard
              lang={lang}
              eyebrow={L("Site · Accueil", "Site · Home")}
              title={L("Raccourcir le titre de l'en-tête", "Shorten the header title")}
              state="proposal"
              summary={L("« L'espresso, partout où vous allez. » devient « L'espresso, partout. »", "“Espresso, wherever you go.” becomes “Espresso, everywhere.”")}
              steps={[
                { title: L("Modifier le texte de l'en-tête", "Edit the header text"), detail: L("Moteur local, sans IA", "Local engine, no AI"), state: "proposal" },
                { title: L("Comparer avant / après", "Compare before / after"), detail: L("Capture de la page d'accueil", "Home page capture"), state: "proposal" },
              ]}
              note={L("Gratuit · annulable (retour à la version 12)", "Free · undoable (back to version 12)")}
              actions={<><SynaButton variant="ghost" size="sm">{L("Plus tard", "Later")}</SynaButton><SynaButton variant="primary" size="sm">{L("Appliquer", "Apply")}</SynaButton></>}
            />
          </div>
        </Section>

        <Section id="sv-quote" eyebrow="04" title={L("Devis et consentement", "Quote and consent")} intro={L("Toujours en % du budget IA du mois. Rien ne part sans un accord explicite.", "Always as a % of the month's AI budget. Nothing starts without explicit consent.")}>
          <div className="sv-grid2 sv-quotes">
            <SynaCostQuote
              lang={lang}
              eyebrow={L("Avant de créer", "Before creating")}
              title={L("3 images de la finition Cuivre", "3 images of the Copper finish")}
              model={L("Qwen-Image 3.0 Pro · format 4:5 · aucune personne · photo du produit fournie", "Qwen-Image 3.0 Pro · 4:5 · no people · product photo provided")}
              costPct={6}
              usedPct={46}
              details={[
                { term: L("Coût probable", "Likely cost"), detail: L("un essai par image ; une reprise n'est débitée que si elle a lieu, et elle est annoncée.", "one attempt per image; a retry is charged only if it happens, and it is announced.") },
                { term: L("Si une image est ratée", "If an image fails"), detail: L("elle est signalée comme ratée, jamais montrée comme bonne.", "it is reported as failed, never shown as good.") },
              ]}
              alternatives={[
                { title: L("Réemployer", "Reuse"), detail: L("2 images de la bibliothèque conviennent", "2 library images fit"), costPct: 0, onChoose: () => undefined },
                { title: L("1 seule image", "Just 1 image"), detail: L("pour tester le rendu", "to test the look"), costPct: 2, onChoose: () => undefined },
              ]}
              footnote={L("Exemple · forfait Développer", "Example · Grow plan")}
              actions={<><SynaButton variant="ghost">{L("Annuler", "Cancel")}</SynaButton><SynaButton variant="primary">{L("Créer · ≈ 6 %", "Create · ≈ 6%")}</SynaButton></>}
            />
            <SynaCostQuote
              lang={lang}
              eyebrow={L("Avant de créer", "Before creating")}
              title={L("Vidéo de 30 secondes", "30-second video")}
              model={L("Exemple : budget presque épuisé", "Example: budget nearly used up")}
              costPct={9}
              usedPct={94}
              headingLevel={3}
              actions={<><SynaButton variant="ghost">{L("Réduire la demande", "Reduce the request")}</SynaButton><SynaButton variant="primary" disabled>{L("Créer", "Create")}</SynaButton></>}
            />
          </div>
        </Section>

        <Section id="sv-meter" eyebrow="05" title={L("Budget et sélection", "Budget and selection")}>
          <div className="sv-row">
            <SynaCostMeter remainingPct={62} lang={lang} />
            <SynaCostMeter remainingPct={12} lang={lang} />
            <SynaCostMeter remainingPct={0} lang={lang} />
          </div>
          <div className="sv-row">
            <SynaSelectionChip kind={L("Section", "Section")} name={L("En-tête", "Header")} where={L("Accueil", "Home")} onClear={() => undefined} lang={lang} />
            <SynaSelectionChip kind={L("Image", "Image")} name={L("Machine sur pierre claire", "Machine on light stone")} where={L("Bibliothèque", "Library")} onClear={() => undefined} lang={lang} />
            <SynaSelectionChip kind={L("Texte", "Text")} name={L("« L'espresso, partout où vous allez. »", "“Espresso, wherever you go.”")} lang={lang} />
          </div>
        </Section>

        <Section id="sv-access" eyebrow="06" title={L("Accès à Syna, sans pastille noire", "Access to Syna, no black pill")} intro={L(
          "Composants prêts pour le lot 1 : onglet signature (Encre), barre de commande (Plein cadre), onglet du téléphone. Le bouton actuel du Studio n'est pas remplacé dans ce lot.",
          "Components ready for lot 1: signature tab (Encre), command bar (Full frame), phone tab. The Studio's current button is not replaced in this lot.",
        )}>
          <div className="sv-access">
            <div className="sv-tile">
              <p className="sy-eyebrow">{L("Onglet signature", "Signature tab")}</p>
              <div className="sv-rails">
                <SynaTrigger variant="rail" expanded={false} lang={lang} />
                <SynaTrigger variant="rail" expanded={true} lang={lang} />
                <SynaTrigger variant="rail" status="working" statusText={L("3 images", "3 images")} lang={lang} />
                <SynaTrigger variant="rail" status="notice" statusText={L("1 image prête", "1 image ready")} lang={lang} />
                <SynaTrigger variant="rail" status="error" statusText={L("1 échec à voir", "1 failure to review")} lang={lang} />
              </div>
              <p className="sy-small">{L("Fermé · ouvert · au travail · résultat prêt · échec", "Closed · open · working · result ready · failure")}</p>
            </div>
            <div className="sv-tile sv-cmds">
              <p className="sy-eyebrow">{L("Barre de commande", "Command bar")}</p>
              <SynaTrigger variant="commandbar" lang={lang} />
              <SynaTrigger variant="commandbar" status="working" statusText={L("Création de 3 images · 2 sur 3", "Creating 3 images · 2 of 3")} lang={lang} />
              <SynaTrigger variant="commandbar" status="notice" statusText={L("3 images prêtes · voir", "3 images ready · view")} lang={lang} />
              <div><SynaTrigger variant="commandbar" compact status="working" lang={lang} /></div>
            </div>
            <div className="sv-tile">
              <p className="sy-eyebrow">{L("Téléphone", "Phone")}</p>
              <div className="sv-tabs">
                <SynaTrigger variant="tab" lang={lang} />
                <SynaTrigger variant="tab" current expanded lang={lang} />
                <SynaTrigger variant="tab" status="notice" statusText={L("1 image prête", "1 image ready")} lang={lang} />
              </div>
            </div>
          </div>
        </Section>

        <Section id="sv-tokens" eyebrow="07" title={L("Couleurs et contraste mesuré", "Colours and measured contrast")} intro={L(
          `${checks.length} couples contrôlés pour ce mode et ce bleu (clair et sombre) : texte au moins ${minText.toFixed(2).replace(".", ",")}:1, contours au moins ${minUi.toFixed(2).replace(".", ",")}:1.`,
          `${checks.length} pairs checked for this mode and blue (light and dark): text at least ${minText.toFixed(2)}:1, outlines at least ${minUi.toFixed(2)}:1.`,
        )}>
          <ul className="sv-swatches">
            {([
              ["ink", palette.ink, palette.sheet], ["ink2", palette.ink2, palette.sheet], ["muted", palette.muted, palette.sheet],
              ["accent", accent.accent, palette.sheet], ["accentInk", accent.accentInk, accent.accent], ["ok", palette.ok, palette.okSoft],
              ["warn", palette.warn, palette.warnSoft], ["bad", palette.bad, palette.badSoft], ["na", palette.na, palette.naSoft],
            ] as const).map(([name, fg, bg]) => (
              <li key={name} style={{ background: bg, color: fg }}>
                <b>Aa</b>
                <span className="sy-num">{name}</span>
                <span className="sy-num">{fg.toUpperCase()}</span>
                <span className="sy-num">{ratio(fg, bg)}:1</span>
              </li>
            ))}
          </ul>
          <p className="sy-small">{L(`États (lecture d'écran) : ${SYNA_STATES.map((s) => stateLabel(s, "fr")).join(", ")}.`, `States: ${SYNA_STATES.map((s) => stateLabel(s, "en")).join(", ")}.`)}</p>
        </Section>
      </div>
    </SynaScope>
  );
}
