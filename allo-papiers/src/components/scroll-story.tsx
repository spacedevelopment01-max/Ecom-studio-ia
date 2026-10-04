"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, PenLine } from "lucide-react";

const STEPS = [
  { n: "01", label: "Photographiez", icon: Camera },
  { n: "02", label: "Comprenez", icon: Check },
  { n: "03", label: "Répondez", icon: PenLine },
];

function StepCard({ index }: { index: number }) {
  if (index === 0)
    return (
      <>
        <p className="eyebrow">01 · Votre courrier</p>
        <h3 className="font-display mt-3 text-[1.7rem] font-semibold leading-tight text-navy">Une demande de justificatifs.</h3>
        <div className="mt-4 space-y-2" aria-hidden>
          <div className="h-2.5 w-11/12 rounded bg-[#ebe5dc]" />
          <div className="h-2.5 w-9/12 rounded bg-[#ebe5dc]" />
          <div className="h-2.5 w-10/12 rounded bg-[#ebe5dc]" />
        </div>
        <p className="mt-4 rounded-lg bg-[#f6e7b8] px-3 py-2 text-[0.95rem] text-navy">« Merci de nous adresser ces pièces avant le 24 octobre. »</p>
        <p className="mt-4 border-t border-line pt-3 text-sm text-muted">Exemple fictif</p>
      </>
    );
  if (index === 1)
    return (
      <>
        <p className="eyebrow">02 · L'essentiel</p>
        <h3 className="font-display mt-3 text-[1.7rem] font-semibold leading-tight text-navy">On vous demande deux documents.</h3>
        <p className="mt-2 text-muted">Votre dossier a besoin de justificatifs supplémentaires.</p>
        <ul className="mt-4 grid gap-2">
          {["Rassembler les pièces demandées", "Vérifier la date limite citée"].map((t) => (
            <li key={t} className="flex items-center gap-2 rounded-xl bg-ok-soft px-3 py-2 text-[0.95rem] text-ok">
              <Check className="h-4 w-4 shrink-0" aria-hidden /> {t}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line pt-3 text-sm text-muted">Exemple fictif · passage source cité</p>
      </>
    );
  return (
    <>
      <p className="eyebrow">03 · Votre réponse</p>
      <h3 className="font-display mt-3 text-[1.7rem] font-semibold leading-tight text-navy">Un brouillon, que vous pouvez modifier.</h3>
      <p className="mt-3 text-[0.98rem] leading-relaxed text-ink/80">Madame, Monsieur,<br />Suite à votre courrier, je vous prie de trouver ci-joint les justificatifs demandés…</p>
      <p className="mt-4 border-t border-line pt-3 text-sm text-muted">Vous relisez. Vous décidez.</p>
    </>
  );
}

/**
 * Séquence animée au défilement (y compris sur téléphone). La progression est calculée à
 * partir de la position de la section ; aucune capture du défilement, aucun blocage.
 * Avec « réduire les animations », les trois cartes s'affichent simplement les unes sous les autres.
 */
export function ScrollStory() {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onMq = () => setReduced(mq.matches);
    mq.addEventListener("change", onMq);
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = rect.height - innerHeight;
        setProgress(total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0);
      });
    };
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  const heading = (
    <div className="px-4 text-center">
      <p className="text-[0.9rem] font-semibold tracking-wide text-[#fdba74]">Un pas après l'autre · exemple animé</p>
      <h2 className="font-display mt-2 text-[2rem] font-semibold leading-tight text-white md:text-[2.8rem]">
        Du courrier compliqué
        <br />à la prochaine étape.
      </h2>
    </div>
  );

  if (reduced) {
    return (
      <section className="bg-navy py-16" aria-label="Fonctionnement en trois étapes">
        {heading}
        <div className="container-page mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className="rounded-[1.4rem] bg-[#fdfbf7] p-6 shadow-xl">
              <StepCard index={i} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const active = Math.min(2, Math.floor(progress * 3 * 0.999));
  return (
    <section ref={ref} className="relative bg-navy" style={{ height: "300vh" }} aria-label="Fonctionnement en trois étapes">
      <div className="sticky top-16 flex h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden md:top-[4.5rem] md:h-[calc(100svh-4.5rem)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgba(194,65,12,0.18),transparent_70%)]" aria-hidden />
        {heading}
        <div className="relative mx-auto mt-6 h-[23rem] w-full max-w-[22rem] px-4 sm:max-w-md">
          {STEPS.map((s, i) => {
            const offset = i - active;
            return (
              <div
                key={s.n}
                aria-hidden={offset !== 0}
                className="absolute inset-x-4 top-0 rounded-[1.4rem] bg-[#fdfbf7] p-6 shadow-2xl transition-all duration-700 ease-[cubic-bezier(.2,.7,.2,1)]"
                style={{
                  transform: `translateX(${offset * 14}%) translateY(${Math.abs(offset) * 14}px) rotate(${offset * 4}deg) scale(${offset === 0 ? 1 : 0.92})`,
                  opacity: offset === 0 ? 1 : offset < 0 ? 0 : 0.35,
                  zIndex: 10 - Math.abs(offset),
                }}
              >
                <StepCard index={i} />
              </div>
            );
          })}
        </div>
        <ol className="mx-auto mt-6 grid w-full max-w-md grid-cols-3 px-4 text-center">
          {STEPS.map((s, i) => (
            <li key={s.n} className="flex flex-col items-center gap-2">
              <span className={`grid h-11 w-11 place-items-center rounded-full border text-sm transition-colors ${i === active ? "border-[#fb923c] text-white" : "border-white/25 text-white/50"}`}>{s.n}</span>
              <span className={`text-[0.98rem] font-semibold transition-colors ${i === active ? "text-white" : "text-white/55"}`}>{s.label}</span>
            </li>
          ))}
        </ol>
        <div className="mx-auto mt-4 h-1 w-full max-w-md px-4" aria-hidden>
          <div className="h-full rounded-full bg-white/15">
            <div className="h-full rounded-full bg-gradient-to-r from-orange to-[#fdba74]" style={{ width: `${Math.max(4, progress * 100)}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
