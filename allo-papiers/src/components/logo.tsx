/** Logo original : enveloppe dans une bulle de dialogue, avec un point orange « nouveau message ». */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path d="M10 4h28a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8H21l-8.5 6.2c-1 .7-2.5 0-2.5-1.3V40a8 8 0 0 1-8-8V12a8 8 0 0 1 8-8Z" fill="#0F1E36" />
      <rect x="12.5" y="14" width="23" height="16" rx="3" fill="none" stroke="#fff" strokeWidth="2.6" />
      <path d="m13.5 16 10.5 7.6L34.5 16" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40.5" cy="7.5" r="6" fill="#C2410C" stroke="#F8F5F0" strokeWidth="2.5" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={compact ? 34 : 40} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.3rem] font-semibold tracking-tight text-navy">Allô Papiers</span>
        {!compact && <span className="mt-1 hidden text-[0.8rem] text-muted sm:block">La paperasse en mode simplifié</span>}
      </span>
    </span>
  );
}
