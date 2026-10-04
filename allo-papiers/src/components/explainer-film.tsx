"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Bell, Camera, Check, FileDown, Fingerprint, MessagesSquare, Pause, PenLine, Play, Search, Send, Sparkles } from "lucide-react";

/**
 * Film d'explication : six courtes scènes animées (CSS), comme une suite de « stories ».
 * - Avance seul, uniquement quand il est visible à l'écran ; pause et chapitres au toucher.
 * - Avec « réduire les animations » : pas de défilement automatique, chaque scène s'affiche finie.
 * Contenu fictif, aucun vrai document.
 */
type Chapter = { id: string; title: string; text: string; icon: typeof Camera; duration: number; scene: () => ReactNode };

const d = (s: number) => ({ ["--d" as string]: `${s}s` }) as CSSProperties;

function Screen({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line bg-cream px-4 py-3">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-navy text-[0.6rem] font-bold text-white">AP</span>
        <span className="text-[0.82rem] font-semibold text-navy">{title}</span>
      </div>
      <div className="relative flex-1 overflow-hidden bg-cream p-3.5">{children}</div>
    </div>
  );
}

function Tap({ style, className = "" }: { style: CSSProperties; className?: string }) {
  return <span aria-hidden className={`f-tap pointer-events-none absolute z-20 h-10 w-10 rounded-full bg-orange/40 ring-4 ring-orange/30 ${className}`} style={style} />;
}

const LetterPaper = ({ small = false }: { small?: boolean }) => (
  <div className={`rounded-lg bg-white shadow-md ${small ? "p-3" : "p-4"}`}>
    <p className="text-[0.62rem] font-bold uppercase tracking-widest text-muted">Caisse d'exemple · fictif</p>
    <div className="mt-2 grid gap-1.5" aria-hidden>
      <div className="h-1.5 w-11/12 rounded bg-[#e7e1d7]" />
      <div className="h-1.5 w-9/12 rounded bg-[#e7e1d7]" />
      <div className="h-1.5 w-10/12 rounded bg-[#e7e1d7]" />
    </div>
    <p className="mt-2 rounded bg-[#f6e7b8] px-1.5 py-1 text-[0.68rem] leading-snug text-navy">Merci de nous adresser ces pièces avant le 24 octobre.</p>
    <div className="mt-2 grid gap-1.5" aria-hidden>
      <div className="h-1.5 w-10/12 rounded bg-[#e7e1d7]" />
      <div className="h-1.5 w-7/12 rounded bg-[#e7e1d7]" />
    </div>
  </div>
);

const CHAPTERS: Chapter[] = [
  {
    id: "photo",
    title: "Photographiez votre courrier",
    text: "Avec l'appareil photo du téléphone, ou en important un PDF. Le site vérifie que la photo est nette.",
    icon: Camera,
    duration: 6,
    scene: () => (
      <div className="relative flex h-full flex-col bg-[#1d2433]">
        <div className="relative mx-5 mt-6 flex-1">
          <div className="f-in absolute inset-0 rotate-[-2deg]" style={d(0.1)}><LetterPaper /></div>
          {/* cadre de visée */}
          {["left-0 top-0 border-l-4 border-t-4", "right-0 top-0 border-r-4 border-t-4", "left-0 bottom-10 border-b-4 border-l-4", "right-0 bottom-10 border-b-4 border-r-4"].map((c) => (
            <span key={c} aria-hidden className={`f-pop absolute h-7 w-7 rounded-sm border-[#fdba74] ${c}`} style={d(0.6)} />
          ))}
          <span aria-hidden className="f-scan absolute inset-x-0 h-1 rounded-full bg-[#fb923c] shadow-[0_0_16px_4px_rgba(251,146,60,0.7)]" style={d(1.2)} />
        </div>
        <span aria-hidden className="f-flash pointer-events-none absolute inset-0 bg-white" style={d(3)} />
        <div className="flex items-center justify-center pb-5 pt-3">
          <span className="f-press grid h-16 w-16 place-items-center rounded-full border-4 border-white/80 bg-white/10" style={d(2.9)}>
            <Camera className="h-7 w-7 text-white" aria-hidden />
          </span>
        </div>
        <div className="f-pop absolute inset-x-6 bottom-24 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[0.75rem] font-semibold text-ok shadow-lg" style={d(3.5)}>
          <Check className="h-4 w-4" aria-hidden /> Page 1 ajoutée · photo nette
        </div>
      </div>
    ),
  },
  {
    id: "comprendre",
    title: "Comprenez en un coup d'œil",
    text: "Un résumé en français simple, l'urgence, la date limite citée mot pour mot, et les étapes à cocher.",
    icon: Sparkles,
    duration: 7,
    scene: () => (
      <Screen title="Résultat">
        <div className="grid gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            <span className="f-pop chip !px-2.5 !py-1 !text-[0.7rem] bg-warn-soft text-warn" style={d(0.2)}>● À traiter</span>
            <span className="f-pop chip !px-2.5 !py-1 !text-[0.7rem]" style={d(0.4)}>Demande de pièces</span>
          </div>
          <div className="f-in rounded-xl bg-white p-3 shadow-sm" style={d(0.6)}>
            <p className="font-display text-[0.95rem] font-semibold">En bref</p>
            <p className="mt-1 text-[0.74rem] leading-snug text-ink/80">On vous demande deux documents pour continuer l'étude de votre dossier.</p>
          </div>
          <div className="f-in rounded-xl bg-white p-3 shadow-sm" style={d(1.4)}>
            <p className="text-[0.62rem] font-bold uppercase tracking-wider text-muted">Date limite</p>
            <p className="text-[0.95rem] font-semibold">24 octobre 2026</p>
            <p className="mt-1 text-[0.7rem] text-ink/80">« <span className="f-hl" style={d(2.1)}>avant le 24 octobre 2026</span> » — p. 1</p>
            <span className="f-pop mt-1.5 inline-block rounded-full bg-ok-soft px-2 py-0.5 text-[0.62rem] font-semibold text-ok" style={d(2.6)}>Date écrite dans le courrier</span>
          </div>
          {["Retrouver l'avis d'imposition", "Demander l'attestation de loyer", "Envoyer avant le 24 octobre"].map((t, i) => (
            <div key={t} className="f-in flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-[0.74rem] shadow-sm" style={d(3.1 + i * 0.35)}>
              <span className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded border-2 border-ok/60">
                <Check className="f-pop h-3 w-3 text-ok" style={d(4.4 + i * 0.5)} aria-hidden />
              </span>
              {t}
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    id: "question",
    title: "Posez vos questions",
    text: "« Que dois-je faire maintenant ? » La réponse s'appuie sur votre courrier et cite le passage. (Offre Plus)",
    icon: MessagesSquare,
    duration: 7,
    scene: () => (
      <Screen title="Questions sur le document">
        <div className="flex h-full flex-col gap-2.5">
          <div className="f-in ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-navy px-3 py-2 text-[0.75rem] text-white" style={d(0.3)}>
            <span className="f-type inline-block align-bottom" style={{ ...d(0.5), ["--t" as string]: "1.4s", ["--s" as string]: 30 }}>Que dois-je faire maintenant ?</span>
          </div>
          <div className="f-in f-dots flex w-14 gap-1 rounded-2xl bg-white px-3 py-2.5 shadow-sm" style={d(2.1)} aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-muted" /><span className="h-1.5 w-1.5 rounded-full bg-muted" /><span className="h-1.5 w-1.5 rounded-full bg-muted" />
          </div>
          <div className="f-in max-w-[92%] rounded-2xl rounded-bl-md bg-white p-3 text-[0.74rem] leading-snug shadow-sm" style={d(3.2)}>
            Rassemblez votre avis d'imposition et une attestation de loyer, puis envoyez-les avant le 24 octobre.
            <p className="f-in mt-2 rounded-lg border-l-4 border-orange/60 bg-sand/70 px-2 py-1.5 text-[0.68rem]" style={d(4.1)}>
              « ces pièces avant le 24 octobre » <span className="text-muted">— p. 1</span>
            </p>
            <p className="f-in mt-2 text-[0.68rem] font-semibold text-navy" style={d(4.8)}>À vérifier : l'adresse d'envoi sur votre espace en ligne.</p>
          </div>
        </div>
      </Screen>
    ),
  },
  {
    id: "rediger",
    title: "Rédigez un courrier",
    text: "Démission, résiliation, réclamation… Quelques questions, puis un courrier propre, modifiable et en PDF.",
    icon: PenLine,
    duration: 7,
    scene: () => (
      <Screen title="Rédiger un courrier">
        <div className="grid gap-2.5">
          <div className="f-in flex items-center gap-2 rounded-xl border-2 border-orange/60 bg-white px-3 py-2 text-[0.75rem]" style={d(0.1)}>
            <Search className="h-4 w-4 text-muted" aria-hidden />
            <span className="f-type inline-block" style={{ ...d(0.4), ["--t" as string]: "0.9s", ["--s" as string]: 12 }}>résiliation</span>
          </div>
          <div className="relative f-in rounded-xl bg-white p-3 shadow-sm" style={d(1.4)}>
            <p className="text-[0.6rem] font-bold uppercase tracking-wider text-orange-dark">Achats et abonnements</p>
            <p className="text-[0.8rem] font-semibold">Résiliation d'une assurance ou d'un abonnement</p>
            <Tap style={{ ...d(2), right: "1rem", top: "0.6rem" }} />
          </div>
          <div className="f-in relative rounded-xl bg-white p-3 shadow-md" style={d(2.6)}>
            <p className="text-[0.66rem] font-semibold">Objet : Résiliation de mon contrat</p>
            <div className="mt-2 grid gap-1.5" aria-hidden>
              {[11, 10, 12, 8, 10, 6].map((w, i) => (
                <div key={i} className="f-line h-1.5 rounded bg-[#d9d2c6]" style={{ ...d(3 + i * 0.25), width: `${w * 8}%` }} />
              ))}
            </div>
            <span className="f-pop absolute -bottom-3 -right-2 flex items-center gap-1 rounded-lg bg-orange px-2.5 py-1.5 text-[0.7rem] font-bold text-white shadow-lg" style={d(5)}>
              <FileDown className="h-3.5 w-3.5" aria-hidden /> PDF
            </span>
          </div>
          <p className="f-in mt-3 flex items-center gap-1.5 text-[0.7rem] font-semibold text-ok" style={d(5.4)}><Check className="h-4 w-4" aria-hidden /> Vous relisez, vous décidez.</p>
        </div>
      </Screen>
    ),
  },
  {
    id: "rappels",
    title: "N'oubliez plus une date",
    text: "Vous confirmez la date limite, et vous recevez un email de rappel avant l'échéance. Jamais sur une date inventée.",
    icon: Bell,
    duration: 6,
    scene: () => (
      <Screen title="Échéances et rappels">
        <div className="f-down absolute inset-x-3 top-2 z-10 flex items-start gap-2 rounded-xl bg-white p-2.5 shadow-xl" style={d(3)}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-orange text-white"><Bell className="h-4 w-4" aria-hidden /></span>
          <span className="text-[0.68rem] leading-snug"><strong>Rappel : dans 2 jours</strong><br />Envoyer les pièces à la caisse</span>
        </div>
        <div className="f-in rounded-xl bg-white p-3 shadow-sm" style={d(0.1)}>
          <p className="text-center text-[0.75rem] font-semibold">Octobre 2026</p>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[0.62rem] text-muted">
            {["L", "M", "M", "J", "V", "S", "D"].map((j, i) => <span key={`j${i}`} className="font-bold text-ink/60">{j}</span>)}
            {/* Le 1er octobre 2026 est un jeudi : trois cases vides */}
            {[0, 1, 2].map((i) => <span key={`v${i}`} aria-hidden />)}
            {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
              <span key={n} className={`relative rounded py-0.5 ${n === 24 ? "font-bold text-white" : ""}`}>
                {n === 24 && <span className="f-pop absolute inset-0 -z-0 rounded-full bg-orange" style={d(1)} aria-hidden />}
                <span className="relative">{n}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="f-in mt-3 flex items-center justify-between rounded-xl bg-white p-3 shadow-sm" style={d(1.6)}>
          <span className="text-[0.72rem]"><strong>24 octobre</strong><br /><span className="text-muted">Envoi des pièces</span></span>
          <span className="f-pop rounded-full bg-ok-soft px-2 py-1 text-[0.62rem] font-semibold text-ok" style={d(2.2)}>Rappels actifs</span>
        </div>
        <div className="mt-5 flex justify-center">
          <Bell className="f-ring h-10 w-10 text-orange" style={d(3.2)} aria-hidden />
        </div>
      </Screen>
    ),
  },
  {
    id: "envoyer",
    title: "Envoyez en toute sécurité",
    text: "Coffre-fort ouvert par empreinte, et aucun envoi sans votre validation : texte, adresse, pièces et prix sous vos yeux.",
    icon: Send,
    duration: 7,
    scene: () => (
      <Screen title="Récapitulatif de l'envoi">
        <div className="grid gap-2">
          <div className="f-in rounded-xl bg-white p-3 text-[0.7rem] shadow-sm" style={d(0.1)}>
            <p className="font-bold uppercase tracking-wider text-muted text-[0.58rem]">Destinataire</p>
            <p className="font-semibold">Caisse d'exemple · 69001 Lyon</p>
            <p className="mt-1.5 font-bold uppercase tracking-wider text-muted text-[0.58rem]">Prix total</p>
            <p className="text-[0.9rem] font-semibold">9,90 € <span className="text-[0.6rem] font-normal text-warn">(tarif de test)</span></p>
          </div>
          <div className="f-in relative flex items-start gap-2 rounded-xl border-2 border-orange/50 bg-orange-soft/70 p-2.5 text-[0.7rem] font-semibold" style={d(0.8)}>
            <span className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded bg-white ring-2 ring-orange/60">
              <Check className="f-pop h-3 w-3 text-orange" style={d(2)} aria-hidden />
            </span>
            J'ai relu et je valide cet envoi en mon nom
            <Tap style={{ ...d(1.8), left: "-0.2rem", top: "0.1rem" }} />
          </div>
          <div className="f-in grid place-items-center rounded-xl bg-white py-3 shadow-sm" style={d(2.6)}>
            <Fingerprint className="f-pop h-10 w-10 text-orange" style={d(3)} aria-hidden />
            <p className="f-in mt-1 text-[0.66rem] font-semibold text-ok" style={d(3.6)}>Identité confirmée sur l'appareil</p>
          </div>
          <div className="relative mt-1">
            <span className="f-press btn btn-primary !min-h-10 w-full !text-[0.75rem]" style={d(4.3)}><Send className="h-4 w-4" aria-hidden /> Envoyer</span>
            <span className="f-pop f-fly absolute right-4 -top-2 grid h-9 w-12 place-items-center rounded-md bg-white shadow-lg" style={{ ...d(4.7) }} aria-hidden>✉</span>
          </div>
        </div>
      </Screen>
    ),
  },
];

export function ExplainerFilm() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const chapter = CHAPTERS[index];
  const running = playing && visible && !reduced;

  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    if (ref.current) io.observe(ref.current);
    const vis = () => document.hidden && setVisible(false);
    document.addEventListener("visibilitychange", vis);
    return () => {
      mq.removeEventListener("change", on);
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  // Horloge du film : n'avance que si le film est visible et en lecture.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 0.1), 100);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (elapsed >= chapter.duration) {
      setElapsed(0);
      setIndex((i) => (i + 1) % CHAPTERS.length);
    }
  }, [elapsed, chapter.duration]);

  const go = (i: number) => {
    setIndex((i + CHAPTERS.length) % CHAPTERS.length);
    setElapsed(0);
  };

  return (
    <div ref={ref} data-film-root data-durations={CHAPTERS.map((c) => c.duration).join(",")} className="grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
      {/* Chapitres (ordinateur : à gauche) */}
      <ol className="hidden gap-2 lg:grid">
        {CHAPTERS.slice(0, 3).map((c, i) => (
          <ChapterButton key={c.id} c={c} i={i} active={i === index} onClick={() => go(i)} />
        ))}
      </ol>

      <div className="mx-auto w-full max-w-[19rem]">
        <div className={`film relative ${running ? "" : "is-paused"}`} aria-roledescription="film animé" aria-label={`Chapitre ${index + 1} sur ${CHAPTERS.length} : ${chapter.title}`}>
          <div className="rounded-[2.4rem] bg-navy p-2.5 shadow-[0_40px_80px_-30px_rgba(15,30,54,0.6)]">
            {/* barres de progression façon « stories » */}
            <div className="absolute inset-x-6 top-5 z-30 flex gap-1" aria-hidden>
              {CHAPTERS.map((c, i) => (
                <span key={c.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                  <span data-film-bar={i} className="block h-full rounded-full bg-white" style={{ width: i < index ? "100%" : i === index ? `${reduced ? 100 : Math.min(100, (elapsed / chapter.duration) * 100)}%` : "0%" }} />
                </span>
              ))}
            </div>
            <div className="relative h-[33rem] overflow-hidden rounded-[1.9rem] bg-cream pt-4">
              {/* Toutes les scènes sont présentes ; afficher une scène masquée relance ses animations. */}
              {CHAPTERS.map((c, i) => (
                <div key={c.id} data-film-scene={i} hidden={i !== index} className="h-full">
                  {c.scene()}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button type="button" data-film-prev className="btn btn-ghost !min-h-11 !px-3" onClick={() => go(index - 1)} aria-label="Chapitre précédent">‹</button>
          <button type="button" data-film-toggle className="btn btn-outline !min-h-11 !px-4" onClick={() => setPlaying((p) => !p)} aria-label={running || (playing && !reduced) ? "Mettre en pause" : "Lire"}>
            <Pause className="h-5 w-5" aria-hidden data-film-icon="pause" style={playing && !reduced ? undefined : { display: "none" }} />
            <Play className="h-5 w-5" aria-hidden data-film-icon="play" style={playing && !reduced ? { display: "none" } : undefined} />
            <span data-film-toggle-label>{playing && !reduced ? "Pause" : "Lecture"}</span>
          </button>
          <button type="button" data-film-next className="btn btn-ghost !min-h-11 !px-3" onClick={() => go(index + 1)} aria-label="Chapitre suivant">›</button>
        </div>
      </div>

      {/* Légende + chapitres (téléphone : en dessous) */}
      <div>
        <div aria-live="polite" className="text-center lg:text-left">
          {CHAPTERS.map((c, i) => (
            <div key={c.id} data-film-caption={i} hidden={i !== index}>
              <p className="eyebrow">Chapitre {i + 1} / {CHAPTERS.length}</p>
              <h3 className="font-display mt-2 text-[1.7rem] font-semibold leading-tight">{c.title}</h3>
              <p className="mx-auto mt-2 max-w-md text-muted lg:mx-0">{c.text}</p>
            </div>
          ))}
        </div>
        <ol className="mt-5 grid gap-2 lg:hidden">
          {CHAPTERS.map((c, i) => (
            <ChapterButton key={c.id} c={c} i={i} active={i === index} onClick={() => go(i)} />
          ))}
        </ol>
        <ol className="mt-5 hidden gap-2 lg:grid">
          {CHAPTERS.slice(3).map((c, i) => (
            <ChapterButton key={c.id} c={c} i={i + 3} active={i + 3 === index} onClick={() => go(i + 3)} />
          ))}
        </ol>
      </div>
    </div>
  );
}

function ChapterButton({ c, i, active, onClick }: { c: Chapter; i: number; active: boolean; onClick: () => void }) {
  return (
    <li>
      <button type="button" data-film-go={i} onClick={onClick} aria-current={active ? "step" : undefined} className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${active ? "border-orange bg-orange-soft" : "border-line bg-white hover:border-navy/30"}`}>
        <span data-film-chip className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? "bg-orange text-white" : "bg-sand text-orange"}`}>
          <c.icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="font-semibold leading-tight">{c.title}</span>
      </button>
    </li>
  );
}
