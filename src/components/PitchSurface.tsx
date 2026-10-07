import { ReactNode } from 'react';

type Orientation = 'horizontal' | 'vertical';

interface PitchSurfaceProps {
  orientation: Orientation;
  children?: ReactNode;
  className?: string;
}

/** Misure di un campo regolamentare (m): 105 x 68 */
const L = 105;
const W = 68;
const STRIPES = 14;

/**
 * Campo da calcio a strisce con le linee regolamentari, disegnato in SVG
 * (niente gradienti CSS). Colori fissi `field-*`, uguali nei due temi.
 * Il contenitore ha le proporzioni reali, così cerchi e aree non si
 * deformano; i figli sono sovrapposti al campo.
 */
export function PitchSurface({ orientation, children, className = '' }: PitchSurfaceProps) {
  const horizontal = orientation === 'horizontal';
  // Disegniamo sempre in orizzontale; in verticale ruotiamo il gruppo
  const vbW = horizontal ? L : W;
  const vbH = horizontal ? W : L;
  const stripe = L / STRIPES;

  return (
    <div className={`relative ${horizontal ? 'aspect-[105/68]' : 'aspect-[68/105]'} ${className}`}>
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <g transform={horizontal ? undefined : `translate(${W} 0) rotate(90)`}>
          {Array.from({ length: STRIPES }, (_, i) => (
            <rect
              key={i}
              x={i * stripe}
              y={0}
              width={stripe + 0.05}
              height={W}
              className={i % 2 === 0 ? 'fill-field-dark' : 'fill-field-light'}
            />
          ))}
          <g className="stroke-field-line" fill="none" strokeWidth={0.45} opacity={0.75}>
            <rect x={0.6} y={0.6} width={L - 1.2} height={W - 1.2} />
            <line x1={L / 2} y1={0.6} x2={L / 2} y2={W - 0.6} />
            <circle cx={L / 2} cy={W / 2} r={9.15} />
            {/* Aree di rigore e aree piccole */}
            <rect x={0.6} y={W / 2 - 20.16} width={16.5} height={40.32} />
            <rect x={L - 0.6 - 16.5} y={W / 2 - 20.16} width={16.5} height={40.32} />
            <rect x={0.6} y={W / 2 - 9.16} width={5.5} height={18.32} />
            <rect x={L - 0.6 - 5.5} y={W / 2 - 9.16} width={5.5} height={18.32} />
            {/* Lunette */}
            <path d={`M ${17.1} ${W / 2 - 7.3} A 9.15 9.15 0 0 1 ${17.1} ${W / 2 + 7.3}`} />
            <path d={`M ${L - 17.1} ${W / 2 - 7.3} A 9.15 9.15 0 0 0 ${L - 17.1} ${W / 2 + 7.3}`} />
            {/* Bandierine */}
            <path d="M 0.6 2.1 A 1.5 1.5 0 0 0 2.1 0.6" />
            <path d={`M ${L - 2.1} 0.6 A 1.5 1.5 0 0 0 ${L - 0.6} 2.1`} />
            <path d={`M 0.6 ${W - 2.1} A 1.5 1.5 0 0 1 2.1 ${W - 0.6}`} />
            <path d={`M ${L - 2.1} ${W - 0.6} A 1.5 1.5 0 0 1 ${L - 0.6} ${W - 2.1}`} />
          </g>
          <g className="fill-field-line" opacity={0.75}>
            <circle cx={L / 2} cy={W / 2} r={0.5} />
            <circle cx={11} cy={W / 2} r={0.4} />
            <circle cx={L - 11} cy={W / 2} r={0.4} />
          </g>
        </g>
      </svg>
      {children && <div className="absolute inset-0">{children}</div>}
    </div>
  );
}
