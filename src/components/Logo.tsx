/**
 * Marchio FantaClash: due chevron che si scontrano, crema e giallo su verde
 * scuro. Colori fissi (uguali anche nella card condivisibile).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
    >
      <rect width="32" height="32" fill="#07492A" />
      <path d="M6 8.5 13.5 16 6 23.5" fill="none" stroke="#F4EEDF" strokeWidth={4.5} strokeLinecap="square" strokeLinejoin="miter" />
      <path d="M26 8.5 18.5 16 26 23.5" fill="none" stroke="#FFD23F" strokeWidth={4.5} strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}
