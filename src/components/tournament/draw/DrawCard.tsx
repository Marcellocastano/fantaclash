import { CSSProperties } from 'react';
import { TournamentTeam } from '../../../domain/tournament';
import { kitOf } from '../../../domain/teamKits';
import { useT } from '../../../i18n/I18nProvider';
import { TeamBadge } from '../TeamBadge';

interface DrawCardProps {
  team: TournamentTeam;
  /** Etichetta "Estrazione {n} di 8" */
  caption?: string;
  /** Entrata con animazione drop (solo durante la fase reveal) */
  dropping?: boolean;
  /** Transform del volo FLIP verso lo slot, impostato dal genitore */
  style?: CSSProperties;
}

/**
 * Figurina della squadra estratta, in scena sopra la coppa:
 * fascia nei colori sociali, stemma, nome e forza. Larghezza fissa e
 * nome su una riga: la card non si comprime mai né sborda dal palco.
 * `data-draw-card` permette al genitore di misurare la posizione per il volo.
 */
export function DrawCard({ team, caption, dropping = true, style }: DrawCardProps) {
  const t = useT();
  const kit = kitOf(team);
  return (
    <div
      data-draw-card
      style={style}
      className={`relative w-48 sm:w-60 shrink-0 border-2 border-ink bg-canvas shadow-block-lg ${
        dropping ? 'motion-safe:animate-drop' : ''
      }`}
    >
      {caption && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-canvas">
          {caption}
        </span>
      )}
      <div
        className="h-3"
        style={{ background: `linear-gradient(to right, ${kit.primary} 65%, ${kit.secondary} 65%)` }}
        aria-hidden="true"
      />
      <div className="px-4 pt-3 pb-4 flex flex-col items-center text-center">
        <TeamBadge team={team} size="lg" />
        <p
          className={`mt-2 max-w-full font-display font-black leading-none whitespace-nowrap truncate text-ink ${
            team.name.length > 14 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'
          }`}
          title={team.name}
        >
          {team.name}
        </p>
        <p className="mt-1 text-sm font-semibold text-ink-muted">
          {t('tournament.draw.strength', { rating: team.rating })}
        </p>
      </div>
    </div>
  );
}
