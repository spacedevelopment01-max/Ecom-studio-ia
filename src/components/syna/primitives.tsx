/**
 * SYNA — primitives présentatives communes aux deux présentations (Encre et Plein cadre). Mission #282, lot 0.
 *
 * Règles :
 * - purement présentatives : aucune requête, aucune écriture, aucun stockage, aucune simulation de succès ;
 *   les actions sont des emplacements (`actions`, `onActivate`, `onClear`…) que le lot suivant branchera ;
 * - un seul balisage pour les deux modes : seule la feuille `syna.css` change la présentation selon le conteneur
 *   `.syna-ui` posé par `SynaScope` ;
 * - les coûts sont toujours en % du budget IA du mois, jamais en euros ;
 * - bilingue FR / EN (`lang`).
 *
 * Aucune de ces primitives n'est encore utilisée par les écrans du Studio (vérifié par tests/syna-lot0-scope.test.ts).
 */
import { useId, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { resolveSynaPrefs, synaScopeAttributes, type ResolvedSynaPrefs, type SynaUiPrefs } from "@/lib/syna-ui/preferences";
import { formatPct, stateLabel, synaText, type SynaState } from "./labels";
import { AlertIcon, ArrowIcon, CloseIcon, StateIcon, TargetIcon } from "./icons";

type Heading = 2 | 3 | 4;
const H = ({ level, ...rest }: { level: Heading; id?: string; className?: string; children: ReactNode }) => {
  const Tag = `h${level}` as "h2";
  return <Tag {...rest} />;
};
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
const clampPct = (v: number) => Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0));

// ——— Conteneur ———

export type SynaScopeProps = {
  /** Réglages déjà résolus (compte / projet / défaut). Sinon, résolus ici à partir de `overrides`. */
  prefs?: ResolvedSynaPrefs;
  overrides?: Partial<SynaUiPrefs>;
  lang?: Lang;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/** Pose le conteneur `.syna-ui` : tout ce qui est dessous prend la présentation choisie, rien au-dehors. */
export function SynaScope({ prefs, overrides, lang, className, style, children }: SynaScopeProps) {
  const p = prefs ?? resolveSynaPrefs(undefined, overrides);
  return (
    <div className={cx("syna-ui", className)} {...synaScopeAttributes(p)} lang={lang} style={{ ...style, ["--sy-convo-w" as string]: `${p.convoWidth}px` }}>
      {children}
    </div>
  );
}

// ——— État unifié ———

export type SynaStateBadgeProps = { state: SynaState; detail?: string; label?: string; lang?: Lang; className?: string };

/** Pastille d'état : icône + mot (jamais la couleur seule), même vocabulaire partout. */
export function SynaStateBadge({ state, detail, label, lang = "fr", className }: SynaStateBadgeProps) {
  return (
    <span className={cx("sy-state", className)} data-state={state}>
      <StateIcon state={state} />
      <span>{label ?? stateLabel(state, lang)}</span>
      {detail ? <span className="sy-state-detail">{detail}</span> : null}
    </span>
  );
}

// ——— Bouton ———

export type SynaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "md" | "sm" };

export function SynaButton({ variant = "secondary", size = "md", className, type = "button", ...rest }: SynaButtonProps) {
  return <button {...rest} type={type} className={cx("sy-btn", className)} data-variant={variant} data-size={size} />;
}

// ——— Progression ———

export type SynaProgressProps = { value?: number | "indeterminate"; label?: string; lang?: Lang };

export function SynaProgress({ value = "indeterminate", label, lang = "fr" }: SynaProgressProps) {
  const det = typeof value === "number";
  const pct = det ? Math.round(clampPct(value * 100)) : undefined;
  return (
    <div
      className="sy-progress"
      role="progressbar"
      aria-label={label ?? synaText("progress", lang)}
      aria-valuemin={det ? 0 : undefined}
      aria-valuemax={det ? 100 : undefined}
      aria-valuenow={pct}
      data-indeterminate={det ? undefined : ""}
      style={det ? ({ ["--sy-value" as string]: `${pct}%` } as CSSProperties) : undefined}
    >
      <i />
    </div>
  );
}

// ——— Carte de tâche / d'action ———

export type SynaStep = { title: string; detail?: string; state: SynaState; stateDetail?: string };

export type SynaActionCardProps = {
  title: string;
  eyebrow?: string;
  state: SynaState;
  stateDetail?: string;
  summary?: ReactNode;
  steps?: SynaStep[];
  progress?: number | "indeterminate";
  note?: ReactNode;
  actions?: ReactNode;
  headingLevel?: Heading;
  lang?: Lang;
};

export function SynaActionCard({ title, eyebrow, state, stateDetail, summary, steps, progress, note, actions, headingLevel = 3, lang = "fr" }: SynaActionCardProps) {
  const id = useId();
  return (
    <article className="sy-card" data-state={state} aria-labelledby={`${id}-t`}>
      <header className="sy-card-h">
        <div>
          {eyebrow ? <p className="sy-eyebrow">{eyebrow}</p> : null}
          <H level={headingLevel} id={`${id}-t`} className="sy-card-t">{title}</H>
        </div>
        <SynaStateBadge state={state} detail={stateDetail} lang={lang} />
      </header>
      {summary ? <p className="sy-card-s">{summary}</p> : null}
      {progress !== undefined ? <SynaProgress value={progress} lang={lang} label={`${synaText("progress", lang)} : ${title}`} /> : null}
      {steps?.length ? (
        <ol className="sy-steps" aria-label={synaText("steps", lang)}>
          {steps.map((s, i) => (
            <li key={i} className="sy-step" data-state={s.state}>
              <span className="sy-step-n" aria-hidden="true">{s.state === "verified" ? "✓" : s.state === "failed" ? "!" : i + 1}</span>
              <div>
                <p className="sy-step-t">{s.title}</p>
                {s.detail ? <p className="sy-step-d">{s.detail}</p> : null}
              </div>
              <SynaStateBadge state={s.state} detail={s.stateDetail} lang={lang} />
            </li>
          ))}
        </ol>
      ) : null}
      {note || actions ? (
        <footer className="sy-card-f">
          {note ? <p className="sy-note">{note}</p> : <span />}
          {actions ? <div className="sy-actions">{actions}</div> : null}
        </footer>
      ) : null}
    </article>
  );
}

// ——— Devis et consentement ———

export type SynaAlternative = { title: string; detail?: string; costPct: number; onChoose?: () => void };

export type SynaCostQuoteProps = {
  title: string;
  eyebrow?: string;
  /** Modèle, format, contraintes (ex. « Qwen-Image 3.0 Pro · 4:5 · aucune personne »). */
  model?: string;
  /** Coût probable de l'action, en % du budget IA du mois. */
  costPct: number;
  /** Part du budget déjà utilisée ce mois, en %. */
  usedPct: number;
  details?: { term: string; detail: ReactNode }[];
  alternatives?: SynaAlternative[];
  footnote?: ReactNode;
  /** Boutons de consentement (« Annuler », « Créer · ≈ 6 % »), branchés au lot suivant. */
  actions?: ReactNode;
  headingLevel?: Heading;
  lang?: Lang;
};

export function synaBudgetSplit(usedPct: number, costPct: number) {
  const used = clampPct(usedPct), cost = Math.max(0, Number.isFinite(costPct) ? costPct : 0);
  const over = used + cost > 100;
  const thisPart = Math.min(cost, 100 - used);
  return { used, cost, thisPart, after: Math.max(0, 100 - used - cost), over };
}

export function SynaCostQuote({ title, eyebrow, model, costPct, usedPct, details, alternatives, footnote, actions, headingLevel = 2, lang = "fr" }: SynaCostQuoteProps) {
  const id = useId();
  const b = synaBudgetSplit(usedPct, costPct);
  const t = (k: Parameters<typeof synaText>[0]) => synaText(k, lang);
  const barLabel = `${t("budgetMonth")} : ${t("alreadyUsed").toLowerCase()} ${formatPct(b.used, lang)}, ${t("thisAction").toLowerCase()} ${formatPct(b.cost, lang, true)}, ${t("leftAfter").toLowerCase()} ${formatPct(b.after, lang, true)}.`;
  return (
    <section className="sy-quote" role="group" aria-labelledby={`${id}-t`} data-over={b.over ? "" : undefined}>
      <div className="sy-quote-h">
        {eyebrow ? <p className="sy-eyebrow">{eyebrow}</p> : null}
        <H level={headingLevel} id={`${id}-t`} className="sy-title">{title}</H>
        {model ? <p className="sy-quote-model">{model}</p> : null}
      </div>
      <div className="sy-quote-figure">
        <p className="sy-pct">
          <span>{formatPct(b.cost, lang, true)}</span>
          <small>{t("ofBudget")}</small>
        </p>
        <SynaStateBadge state="proposal" label={t("quote")} lang={lang} />
      </div>
      <div className="sy-budget">
        <div className="sy-budget-bar" role="img" aria-label={barLabel}>
          <span className="sy-used" style={{ width: `${b.used}%` }} />
          <span className="sy-this" style={{ width: `${b.thisPart}%` }} />
        </div>
        <ul className="sy-legend" aria-hidden="true">
          <li style={{ ["--sy-swatch" as string]: "color-mix(in srgb, var(--sy-ink2) 38%, transparent)" } as CSSProperties}>{t("alreadyUsed")} · {formatPct(b.used, lang)}</li>
          <li style={{ ["--sy-swatch" as string]: b.over ? "var(--sy-bad)" : "var(--sy-accent)" } as CSSProperties}>{t("thisAction")} · {formatPct(b.cost, lang, true)}</li>
          <li style={{ ["--sy-swatch" as string]: "var(--sy-wash)" } as CSSProperties}>{t("leftAfter")} · {formatPct(b.after, lang, true)}</li>
        </ul>
      </div>
      {b.over ? (
        <p className="sy-alert" data-tone="bad" role="alert"><AlertIcon /><span>{t("overBudget")}</span></p>
      ) : null}
      {details?.length ? (
        <dl className="sy-kv">
          {details.map((d) => [<dt key={`t-${d.term}`}>{d.term}</dt>, <dd key={`d-${d.term}`}>{d.detail}</dd>])}
        </dl>
      ) : null}
      {alternatives?.length ? (
        <ul className="sy-alts" aria-label={t("alternatives")}>
          {alternatives.map((a) => {
            const body = (
              <>
                <b>{a.title}</b>
                {a.detail ? <span>{a.detail}</span> : null}
                <span className="sy-num">{a.costPct > 0 ? formatPct(a.costPct, lang, true) : formatPct(0, lang)}</span>
              </>
            );
            return <li key={a.title}>{a.onChoose ? <button type="button" className="sy-alt" onClick={a.onChoose}>{body}</button> : <div className="sy-alt">{body}</div>}</li>;
          })}
        </ul>
      ) : null}
      {footnote || actions ? (
        <div className="sy-quote-f">
          {footnote ? <p className="sy-note">{footnote}</p> : <span />}
          {actions ? <div className="sy-actions">{actions}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

// ——— Indicateur de coût ———

export type SynaCostMeterProps = { remainingPct: number; label?: string; lang?: Lang };

/** Budget IA restant du mois, en %. Bas (≤ 15 %) : ambre ; épuisé : rouge. Lu comme un compteur par les lecteurs d'écran. */
export function SynaCostMeter({ remainingPct, label, lang = "fr" }: SynaCostMeterProps) {
  const v = Math.round(clampPct(remainingPct));
  const level = v <= 0 ? "empty" : v <= 15 ? "low" : "ok";
  const text = `${formatPct(v, lang)} ${synaText("remaining", lang)}`;
  const name = label ?? synaText("budgetMonth", lang);
  return (
    <div className="sy-meter" role="meter" aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-valuetext={text} data-level={level}>
      <span className="sy-meter-l" aria-hidden="true"><span>{name}</span><b>{text}</b></span>
      <span className="sy-meter-g" aria-hidden="true"><i style={{ ["--sy-value" as string]: `${v}%` } as CSSProperties} /></span>
    </div>
  );
}

// ——— Puce de sélection ———

export type SynaSelectionChipProps = { kind: string; name: string; where?: string; onClear?: () => void; lang?: Lang };

/** Ce que l'utilisateur a désigné dans l'aperçu, rappelé dans la conversation. Bouton « retirer » seulement s'il agit. */
export function SynaSelectionChip({ kind, name, where, onClear, lang = "fr" }: SynaSelectionChipProps) {
  return (
    <span className="sy-chip">
      <TargetIcon />
      <span className="sy-chip-text">
        <span className="sy-sr">{synaText("selection", lang)} :</span>
        <span className="sy-chip-kind">{kind}</span>
        <span className="sy-chip-name">{name}</span>
        {where ? <span className="sy-chip-where">· {where}</span> : null}
      </span>
      {onClear ? (
        <button type="button" className="sy-chip-x" onClick={onClear} aria-label={`${synaText("clearSelection", lang)} : ${name}`}>
          <CloseIcon />
        </button>
      ) : null}
    </span>
  );
}

// ——— Accès à SYNA ———

export type SynaTriggerStatus = "idle" | "working" | "notice" | "error";

export type SynaTriggerProps = {
  /** `rail` : onglet signature Encre ; `commandbar` : barre de commande Plein cadre ; `tab` : onglet de la barre basse au téléphone. */
  variant: "rail" | "commandbar" | "tab";
  expanded?: boolean;
  status?: SynaTriggerStatus;
  /** Ce que SYNA fait ou a fini (« Création de 3 images », « 3 images prêtes »). */
  statusText?: string;
  /** Barre réduite en pastille pendant un travail à la main (Plein cadre). */
  compact?: boolean;
  /** Raccourci annoncé (ex. « Ctrl K ») : affiché seulement s'il est réellement branché. */
  shortcut?: string;
  controls?: string;
  current?: boolean;
  onActivate?: () => void;
  lang?: Lang;
};

/** Point d'accès à SYNA. Jamais une pastille noire flottante : un onglet signature ou une barre de commande. */
export function SynaTrigger({ variant, expanded, status = "idle", statusText, compact, shortcut, controls, current, onActivate, lang = "fr" }: SynaTriggerProps) {
  const t = (k: Parameters<typeof synaText>[0]) => synaText(k, lang);
  const dot = status === "notice" || status === "error";
  const spoken = status === "working" ? `${t("working")}${statusText ? ` : ${statusText}` : ""}` : statusText ?? "";
  const common = {
    type: "button" as const,
    className: "sy-trigger",
    "data-variant": variant,
    "data-status": status,
    "aria-expanded": expanded,
    "aria-controls": controls,
    "aria-keyshortcuts": shortcut ? shortcut.replace(/\s+/g, "+") : undefined,
    "aria-current": current ? ("page" as const) : undefined,
    onClick: onActivate,
  };
  if (variant === "commandbar") {
    return (
      <button {...common} data-compact={compact ? "" : undefined} aria-label={compact ? `${t("openSyna")}${spoken ? ` — ${spoken}` : ""}` : undefined}>
        <span className="sy-dot" data-tone={status === "error" ? "bad" : undefined} aria-hidden="true" />
        <span className="sy-cmd-text">{compact ? "Syna" : statusText ?? t("askSyna")}</span>
        {!compact && status === "working" ? <span className="sy-sr">{t("working")}</span> : null}
        {!compact && shortcut ? <kbd className="sy-kbd" aria-hidden="true">{shortcut}</kbd> : null}
        {!compact ? <span className="sy-cmd-go" aria-hidden="true"><ArrowIcon /></span> : null}
      </button>
    );
  }
  const name = `${expanded ? t("closeSyna") : t("openSyna")}${spoken ? ` — ${spoken}` : ""}`;
  return (
    <button {...common} aria-label={name}>
      <span className="sy-wordmark" aria-hidden="true">Syna</span>
      {variant === "rail" && shortcut ? <span className="sy-trigger-hint" aria-hidden="true">{shortcut}</span> : null}
      {dot ? <span className="sy-dot" data-tone={status === "error" ? "bad" : undefined} aria-hidden="true" /> : null}
    </button>
  );
}

// ——— Messages et saisie ———

export function SynaMessage({ from, children, lang = "fr" }: { from: "syna" | "user"; children: ReactNode; lang?: Lang }) {
  return (
    <div className="sy-msg" data-from={from}>
      {from === "syna" ? <span className="sy-who">Syna</span> : <span className="sy-sr">{lang === "en" ? "You" : "Vous"} :</span>}
      {children}
    </div>
  );
}

export type SynaComposerProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  onSend?: () => void;
  placeholder?: string;
  selection?: ReactNode;
  lang?: Lang;
};

/** Zone de saisie (présentation). Le bouton Envoyer reste inactif tant qu'aucun envoi n'est branché. */
export function SynaComposer({ value, defaultValue, onChange, onSend, placeholder, selection, lang = "fr" }: SynaComposerProps) {
  const id = useId();
  return (
    <div className="sy-composer">
      {selection}
      <label htmlFor={`${id}-m`} className="sy-sr">{synaText("message", lang)}</label>
      <textarea
        id={`${id}-m`}
        rows={1}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={value !== undefined && !onChange}
        placeholder={placeholder ?? synaText("askSyna", lang)}
      />
      <SynaButton variant="primary" size="sm" onClick={onSend} disabled={!onSend} aria-label={synaText("send", lang)}>
        <ArrowIcon />
      </SynaButton>
    </div>
  );
}

// ——— Coquille : conversation + espace de travail ———

export type SynaShellProps = {
  conversation: { header?: ReactNode; thread: ReactNode; footer?: ReactNode };
  workspace: { header?: ReactNode; stage: ReactNode; label?: string };
  /** Onglet signature (Encre, colonne repliée). */
  rail?: ReactNode;
  /** Barre de commande (Plein cadre), dans sa zone réservée. */
  commandBar?: ReactNode;
  /** Barre basse au téléphone (Encre). */
  tabbar?: ReactNode;
  panel?: "pinned" | "collapsed";
  /** Au téléphone : la vue affichée (une seule à la fois en Encre). */
  mobileView?: "conversation" | "workspace";
  conversationId?: string;
  lang?: Lang;
};

/** Même contenu, deux présentations : Encre (côte à côte) ou Plein cadre (résultat plein écran, feuille, barre). */
export function SynaShell({ conversation, workspace, rail, commandBar, tabbar, panel = "pinned", mobileView = "workspace", conversationId, lang = "fr" }: SynaShellProps) {
  return (
    <div className="sy-frame">
      <div className="sy-shell" data-panel={panel} data-mobile-view={mobileView}>
        {rail ? <div className="sy-rail-zone">{rail}</div> : null}
        <aside className="sy-convo" id={conversationId} aria-label={synaText("conversation", lang)}>
          <div className="sy-convo-h">{conversation.header}</div>
          <div className="sy-thread">{conversation.thread}</div>
          {conversation.footer ? <div className="sy-convo-f">{conversation.footer}</div> : <span />}
        </aside>
        <section className="sy-work" aria-label={workspace.label ?? synaText("workspace", lang)}>
          <div className="sy-work-h">{workspace.header}</div>
          <div className="sy-stage">{workspace.stage}</div>
        </section>
        {commandBar ? <div className="sy-cmd-zone">{commandBar}</div> : null}
        {tabbar ? <nav className="sy-tabbar" aria-label={lang === "en" ? "Mobile navigation" : "Navigation mobile"}>{tabbar}</nav> : null}
      </div>
    </div>
  );
}
