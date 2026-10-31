/** Icônes au trait des primitives SYNA (un seul style, épaisseur 1,6, `currentColor`, toujours décoratives). */
import type { SynaState } from "./labels";

type P = { className?: string };
const base = (className?: string) => ({
  className: ["sy-icon", className].filter(Boolean).join(" "),
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

export function StateIcon({ state, className }: P & { state: SynaState }) {
  switch (state) {
    case "proposal":
      return <svg {...base(className)}><circle cx="8" cy="8" r="5.5" strokeDasharray="2.2 2.2" /></svg>;
    case "draft":
      return <svg {...base(className)}><path d="M3 13l1-3.5L10.5 3 13 5.5 6.5 12 3 13z" /></svg>;
    case "confirmed":
      return <svg {...base(className)}><circle cx="8" cy="8" r="5.5" /><path d="M5.6 8.2l1.6 1.6 3.2-3.4" /></svg>;
    case "running":
      return <svg {...base(className)}><path d="M8 2.5a5.5 5.5 0 1 1-5.5 5.5" /></svg>;
    case "verified":
      return <svg {...base(className)}><path d="M3.5 8.4l3 3 6-6.6" /></svg>;
    case "failed":
      return <svg {...base(className)}><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.4M8 10.8v.01" /></svg>;
    case "unavailable":
      return <svg {...base(className)}><circle cx="8" cy="8" r="5.5" /><path d="M5.2 8h5.6" /></svg>;
  }
}

export const TargetIcon = ({ className }: P) => (
  <svg {...base(className)}><rect x="2.5" y="2.5" width="11" height="11" rx="2" strokeDasharray="2.4 1.8" /><path d="M8 6v4M6 8h4" /></svg>
);
export const CloseIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" /></svg>
);
export const ArrowIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M3 8h9.5M8.5 4l4 4-4 4" /></svg>
);
export const AlertIcon = ({ className }: P) => (
  <svg {...base(className)}><path d="M8 2.5l6 10.5H2L8 2.5z" /><path d="M8 6.6v3M8 11.4v.01" /></svg>
);
