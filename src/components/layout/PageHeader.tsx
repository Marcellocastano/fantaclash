import { ReactNode } from 'react';

/** Container condiviso delle schermate di gioco */
export const PAGE_CONTAINER = 'flex-1 w-full max-w-[1300px] mx-auto px-4 py-8 sm:py-10';

interface PageHeaderProps {
  kicker?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Azioni a destra del titolo su desktop (centrate se center) */
  actions?: ReactNode;
  /** Titolo centrato (es. hero del torneo) */
  center?: boolean;
}

/**
 * Intestazione standard delle pagine: kicker piccolo whistle in
 * maiuscolo, titolo grande, sottotitolo e azioni affiancate su desktop.
 */
export function PageHeader({ kicker, title, subtitle, actions, center = false }: PageHeaderProps) {
  return (
    <header
      className={`mb-8 sm:mb-10 flex flex-col gap-5 ${
        center ? 'items-center text-center' : 'lg:flex-row lg:items-end lg:justify-between'
      }`}
    >
      <div className={center ? 'flex flex-col items-center' : 'min-w-0'}>
        {kicker && (
          <p className="font-display text-xl sm:text-2xl font-extrabold text-whistle-deep leading-none">
            {kicker}
          </p>
        )}
        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-black text-ink leading-none mt-2 break-words">
          {title}
        </h1>
        {subtitle && <p className="text-base sm:text-lg text-ink-soft mt-3 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && (
        <div className={`flex flex-wrap items-center gap-3 shrink-0 ${center ? 'justify-center' : ''}`}>
          {actions}
        </div>
      )}
    </header>
  );
}
