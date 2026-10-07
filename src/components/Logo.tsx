/**
 * Marchio FantaClash: due chevron che si scontrano, avorio e pesca su verde bosco.
 * Colori fissi, uguali in entrambi i temi.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" rx="4" fill="#344B43" />
      <path d="M6 8.5 13.5 16 6 23.5" fill="none" stroke="#F5F3EE" strokeWidth={4.5} strokeLinecap="square" strokeLinejoin="miter" />
      <path d="M26 8.5 18.5 16 26 23.5" fill="none" stroke="#E7BFA8" strokeWidth={4.5} strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}
