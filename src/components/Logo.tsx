/**
 * Marchio FantaClash: il martelletto dell'asta che abbatte sul piedistallo.
 * Testa gialla fra due cappelle crema, manico crema, base trapezoidale con
 * lastra arancio e due punte di velocità. Forme piatte (angoli morbidi,
 * niente contorno inchiostro): fedele all'artwork generato
 * (design/new-logo.png). Colori fissi (uguali anche nella card condivisibile).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="FantaClash"
      className={className}
    >
      <rect width="32" height="32" fill="#07492A" />
      {/* lastra arancio sulla base */}
      <path fill="#F45B18" d="M 13.03 22.9 A 6.86 0.8 0 1 0 26.75 22.9 A 6.86 0.8 0 1 0 13.03 22.9 Z" />
      {/* base trapezoidale del ceppo */}
      <path fill="#F4EEDF" d="M 12.87 24.39 L 27.12 24.39 Q 27.58 24.39 27.75 24.85 L 28.48 26.31 Q 19.96 28.27 11.38 26.31 L 12.17 24.85 Q 12.34 24.39 12.87 24.39 Z" />
      {/* manico verso il basso a sinistra */}
      <path fill="#F4EEDF" d="M 3.14 20.19 L 14.9 14.2 Q 15.96 13.66 16.5 14.72 L 16.5 14.72 Q 17.04 15.78 15.98 16.32 L 4.23 22.31 Q 3.16 22.85 2.62 21.79 L 2.62 21.79 Q 2.08 20.73 3.14 20.19 Z" />
      {/* cappella inferiore */}
      <path fill="#F4EEDF" d="M 16.18 18.21 L 22.74 14.87 Q 23.33 14.57 23.63 15.16 L 24.24 16.37 Q 24.54 16.96 23.95 17.26 L 17.4 20.6 Q 16.81 20.91 16.51 20.31 L 15.89 19.1 Q 15.59 18.51 16.18 18.21 Z" />
      {/* testa gialla */}
      <path fill="#FFD23F" d="M 13.92 12.57 L 19.83 9.57 Q 19.89 9.54 19.92 9.59 L 22.38 14.44 Q 22.41 14.5 22.35 14.53 L 16.45 17.54 Q 16.39 17.57 16.36 17.51 L 13.89 12.66 Q 13.86 12.61 13.92 12.57 Z" />
      {/* cappella superiore */}
      <path fill="#F4EEDF" d="M 12.14 9.59 L 18.7 6.25 Q 19.29 5.95 19.59 6.54 L 20.21 7.75 Q 20.51 8.35 19.92 8.65 L 13.36 11.99 Q 12.77 12.29 12.47 11.7 L 11.85 10.49 Q 11.55 9.9 12.14 9.59 Z" />
      {/* punte di velocità */}
      <path fill="#F45B18" d="M 25.43 18.22 L 27.68 12.99 L 29.37 14.08 Z" />
      <path fill="#F45B18" d="M 25.46 19.81 L 29.94 16.9 L 30.5 18.32 Z" />
    </svg>
  );
}
