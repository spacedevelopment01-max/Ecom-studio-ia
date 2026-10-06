"use client";
/** Composants d'interface du studio (accessibles, clair/sombre). */
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Moon, Sun, X, Loader2, Check, AlertTriangle, Info } from "lucide-react";
import { currentLang, useT } from "./i18n";
import { CONTENT_LANG_HEADER, intlLocale, type Lang } from "@/lib/i18n";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------- données

/** Appel d'API du studio. `lang` : langue des contenus créés par cette action (sinon celle du projet). */
export async function api<T = any>(url: string, opts: { method?: string; body?: unknown; form?: FormData; lang?: Lang } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (!opts.form && opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.lang) headers[CONTENT_LANG_HEADER] = opts.lang;
  const r = await fetch(url, {
    method: opts.method ?? (opts.body || opts.form ? "POST" : "GET"),
    headers,
    body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  });
  const text = await r.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text };
  }
  if (!r.ok) throw new Error(data?.error ?? `${currentLang() === "en" ? "Error" : "Erreur"} ${r.status}`);
  return data as T;
}

/** Lecture avec rafraîchissement périodique facultatif. */
export function useApi<T = any>(url: string | null, opts: { poll?: number } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!url);
  const alive = useRef(true);
  // Adresse en cours : une réponse arrivée après un changement d'adresse (onglet, filtre) est ignorée,
  // sinon elle écraserait les données de la nouvelle adresse.
  const current = useRef(url);
  current.current = url;
  const load = useCallback(async () => {
    if (!url) return;
    const fresh = () => alive.current && current.current === url;
    try {
      const d = await api<T>(url);
      if (fresh()) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (fresh()) setError((e as Error).message);
    } finally {
      if (fresh()) setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    alive.current = true;
    setLoading(!!url);
    load();
    if (!opts.poll || !url) return () => void (alive.current = false);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, opts.poll);
    return () => {
      alive.current = false;
      clearInterval(t);
    };
  }, [url, opts.poll, load]);
  return { data, error, loading, reload: load, setData };
}

// ---------------------------------------------------------------- notifications

type ToastItem = { id: number; kind: "ok" | "bad" | "info"; text: string };
const ToastCtx = createContext<(kind: ToastItem["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((kind: ToastItem["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === "bad" ? 8000 : 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx("pointer-events-auto flex w-full max-w-lg items-start gap-2 break-words rounded-2xl px-4 py-3 text-sm shadow-soft", t.kind === "bad" ? "bg-bad text-white" : t.kind === "ok" ? "bg-ink text-paper" : "bg-card text-ink border border-line")}>
            {t.kind === "bad" ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : t.kind === "ok" ? <Check className="mt-0.5 size-4 shrink-0" /> : <Info className="mt-0.5 size-4 shrink-0" />}
            <span className="min-w-0">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------------------------------------------------------------- éléments

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" | "signal"; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: ReactNode };

const btnBase = "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 select-none whitespace-nowrap";
const btnVariants = {
  primary: "bg-ink text-paper hover:-translate-y-0.5 hover:shadow-soft",
  signal: "bg-signal text-signal-ink hover:-translate-y-0.5 hover:shadow-soft",
  secondary: "border border-line bg-card text-ink hover:border-ink",
  ghost: "text-ink hover:bg-paper-2",
  danger: "border border-bad/40 text-bad hover:bg-bad-soft",
};
const btnSizes = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-[15px]" };

export function Button({ variant = "primary", size = "md", loading, icon, className, children, ...rest }: BtnProps) {
  return (
    <button {...rest} className={cx(btnBase, btnVariants[variant], btnSizes[size], className)} aria-busy={loading || undefined}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", size = "md", className, children, icon, ...rest }: { href: string; variant?: BtnProps["variant"]; size?: BtnProps["size"]; className?: string; children: ReactNode; icon?: ReactNode; target?: string; rel?: string; download?: boolean | string }) {
  return (
    <Link href={href} className={cx(btnBase, btnVariants[variant], btnSizes[size], className)} {...(rest as any)}>
      {icon}
      {children}
    </Link>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx("rounded-3xl border border-line bg-card", className)}>
      {children}
    </div>
  );
}

const badgeTone: Record<string, string> = {
  neutral: "bg-paper-2 text-ink-2",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  signal: "bg-signal-soft text-signal",
  ink: "bg-ink text-paper",
};
export function Badge({ tone = "neutral", children, className, dot }: { tone?: keyof typeof badgeTone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", badgeTone[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-bad">{error}</p>}
    </div>
  );
}

export const inputCls = "h-11 w-full min-w-0 rounded-2xl border border-line bg-card px-4 text-[15px] text-ink placeholder:text-muted/70 outline-none transition focus:border-ink";
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
/** `autoGrow` : la zone s'agrandit avec son texte (tout reste lisible, sans barre de défilement interne). */
export function Textarea({ autoGrow, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { autoGrow?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!autoGrow || !el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight + 2}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement ?? el);
    return () => ro.disconnect();
  }, [autoGrow, props.value]);
  return <textarea ref={ref} {...props} className={cx(inputCls, "h-auto py-3 leading-relaxed", autoGrow ? "min-h-0 resize-none overflow-hidden" : "min-h-24", props.className)} />;
}
export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(inputCls, "appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-3 text-sm", disabled && "opacity-50")}>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={cx("relative h-6 w-11 rounded-full transition", checked ? "bg-ink" : "bg-line")}>
        <span className={cx("absolute top-0.5 size-5 rounded-full bg-paper shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </button>
      <span>{label}</span>
    </label>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cx("h-1.5 w-full overflow-hidden rounded-full bg-paper-2", className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-signal transition-[width] duration-700" style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  const t = useT();
  return <Loader2 className={cx("size-4 animate-spin", className)} aria-label={t("Chargement", "Loading")} />;
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid place-items-center gap-3 rounded-3xl border border-dashed border-line px-6 py-14 text-center">
      {icon && <div className="grid size-12 place-items-center rounded-2xl bg-paper-2 text-ink-2">{icon}</div>}
      <h3 className="font-display text-xl">{title}</h3>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide, xl }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; xl?: boolean }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  // onClose change à chaque rendu du parent (actualisation automatique du studio) : on garde la dernière
  // version dans une ref pour que l'ouverture (focus, défilement) ne soit faite qu'une fois.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,textarea,select,button")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus({ preventScroll: true });
    };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && closeRef.current()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={cx("max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-line bg-card p-5 shadow-soft sm:rounded-3xl sm:p-7", xl ? "sm:max-w-6xl" : wide ? "sm:max-w-4xl" : "sm:max-w-lg")}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl">{title}</h2>
          <button type="button" onClick={() => closeRef.current()} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-paper-2" aria-label={t("Fermer", "Close")}>
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  const [mode, setMode] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const t = document.documentElement.dataset.theme as any;
    setMode(t === "light" || t === "dark" ? t : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("ecs-theme", next);
    } catch {}
    setMode(next);
  };
  return (
    <button onClick={toggle} className={cx("grid size-10 place-items-center rounded-full border border-line bg-card text-ink transition hover:border-ink", className)} aria-label={mode === "dark" ? t("Passer en mode clair", "Switch to light mode") : t("Passer en mode sombre", "Switch to dark mode")}>
      {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2", className)}>
      <svg viewBox="0 0 64 64" className="size-8 shrink-0" aria-hidden>
        <rect width="64" height="64" rx="16" fill="currentColor" />
        <path d="M18 20h22v6H25v4h13v6H25v4h15v6H18z" fill="var(--paper)" />
        <circle cx="46" cy="44" r="5" fill="var(--signal)" />
      </svg>
      {!compact && (
        <span className="font-display text-[17px] font-semibold leading-none tracking-tight">
          E-COM STUDIO <span className="serif-i text-signal">ia</span>
        </span>
      )}
    </span>
  );
}

export function formatDate(ms: number, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }, tz?: string) {
  return new Intl.DateTimeFormat(intlLocale(currentLang()), { ...opts, timeZone: tz }).format(new Date(ms));
}
export function formatBytes(n: number) {
  const [b, k, m] = currentLang() === "en" ? ["B", "KB", "MB"] : ["o", "Ko", "Mo"];
  if (n < 1024) return `${n} ${b}`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} ${k}`;
  return `${(n / 1024 / 1024).toFixed(1)} ${m}`;
}
