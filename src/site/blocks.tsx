import { ReactNode } from 'react';
import { Icon } from '../components/Icon';

/**
 * Blocchi tipografici per le pagine di contenuto: stile del sito
 * (Big Shoulders per i titoli, bordi inchiostro per i riquadri) con una
 * larghezza di lettura comoda.
 */

export function PageTitle({ kicker, children }: { kicker?: string; children: ReactNode }) {
  return (
    <header className="mb-10">
      {kicker && <p className="font-display text-sm font-extrabold tracking-wide text-whistle-deep">{kicker.toUpperCase()}</p>}
      <h1 className="font-display text-5xl md:text-6xl font-black text-ink leading-[1.05] mt-2 max-w-3xl">{children}</h1>
    </header>
  );
}

/** Testo dell'articolo: paragrafi ariosi, dimensione di lettura */
export function Prose({ children }: { children: ReactNode }) {
  return <div className="max-w-3xl space-y-5 text-lg leading-relaxed text-ink">{children}</div>;
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-4xl font-black text-ink leading-none pt-6">{children}</h2>;
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="font-display text-2xl font-black text-ink leading-none pt-4">{children}</h3>;
}

/** Elenco puntato marcato */
export function Ul({ children }: { children: ReactNode }) {
  return <ul className="space-y-3 pl-1">{children}</ul>;
}

export function Li({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2.5 h-2 w-2 shrink-0 bg-whistle border border-ink" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

/** Tabella con stile del sito */
export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto my-6">
      <table className="w-full text-left border-2 border-ink bg-surface shadow-block-sm">
        <thead>
          <tr className="bg-ink text-canvas">
            {head.map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 font-display font-extrabold text-lg leading-none">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i % 2 ? 'bg-canvas' : 'bg-surface'}>
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-3 border-t-2 border-ink/15 ${j === 0 ? 'font-bold' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Invito a giocare alla fine di una pagina di contenuto */
export function GameCta({ title = "Metti in pratica con FantaClash", text, season }: { title?: string; text?: ReactNode; season?: string }) {
  return (
    <aside className="mt-14 bg-pitch-deep border-2 border-ink shadow-block p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6">
      <div className="max-w-lg">
        <p className="font-display text-sm font-extrabold tracking-wide text-highlight">GIOCA</p>
        <p className="font-display text-3xl font-black text-canvas leading-tight mt-2">{title}</p>
        {text && <p className="text-canvas/80 mt-2">{text}</p>}
      </div>
      <a href={season ? `/?annata=${season}` : '/'} className="btn-cta">
        Gioca gratis
        <Icon name="arrow" className="w-7 h-7" />
      </a>
    </aside>
  );
}
