import { useMemo, useState } from 'react';
import { DEFAULT_FORMATION, FORMATIONS, autoLineup, benchPlayers, isValidLineup, lineupPlayers, validateLineup } from '../../domain/teams/formations';
import type { FormationId, Lineup } from '../../domain/teams/formations';
import { lineupRating } from '../../domain/teams/teamStrength';
import { playerOverall } from '../../services/auction/teamStrength';
import type { Player, PlayerRole, Team } from '../../types';
import { shortName } from '../../utils/playerName';
import { Icon } from '../Icon';
import { ROLE_TAG } from '../player/tier';
import { FormationPicker } from './FormationPicker';
import { LineupPitch } from './LineupPitch';

const ROLE_NAMES: Record<PlayerRole, string> = { P: 'Portiere', D: 'Difesa', C: 'Centrocampo', A: 'Attacco' };
const ROLE_ORDER: PlayerRole[] = ['P', 'D', 'C', 'A'];

export interface LineupScreenProps {
  team: Team;
  initialLineup?: Lineup;
  title?: string;
  description?: string;
  submitLabel?: string;
  readOnly?: boolean;
  submitDisabled?: boolean;
  sentLabel?: string;
  onConfirm: (lineup: Lineup) => void;
  onCancel?: () => void;
}

export function LineupScreen({
  team,
  initialLineup,
  title = 'Scegli la formazione',
  description = 'Scegli il modulo e gli otto titolari. Le quattro riserve non entreranno durante la partita.',
  submitLabel = 'Conferma formazione',
  readOnly = false,
  submitDisabled = false,
  sentLabel,
  onConfirm,
  onCancel,
}: LineupScreenProps) {
  const players = useMemo(() => team.roster.map(owned => owned.player), [team.roster]);
  const [lineup, setLineup] = useState<Lineup>(() => {
    const chosen = initialLineup ?? team.lineup;
    return chosen && isValidLineup(players, chosen) ? chosen : autoLineup(players, DEFAULT_FORMATION);
  });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const slots = FORMATIONS[lineup.formation].layout;
  const slotRole = selectedIndex >= 0 ? slots[selectedIndex]?.role : undefined;
  const validation = validateLineup(players, lineup);
  const starters = lineupPlayers(players, lineup);
  const bench = benchPlayers(players, lineup);
  const strength = lineupRating(starters, lineup.formation);
  const roleStrength = Object.fromEntries(ROLE_ORDER.map(role => {
    const rolePlayers = starters.filter(player => player.role === role);
    const value = rolePlayers.length ? Math.round(rolePlayers.reduce((sum, player) => sum + playerOverall(player), 0) / rolePlayers.length) : 0;
    return [role, value];
  })) as Record<PlayerRole, number>;

  const chooseFormation = (formation: FormationId) => {
    const fallback = autoLineup(players, formation);
    const previousByRole: Record<PlayerRole, string[]> = { P: [], D: [], C: [], A: [] };
    lineup.starters.forEach((id, index) => previousByRole[slots[index].role].push(id));
    const used = new Set<string>();
    const starters = FORMATIONS[formation].layout.map(slot => {
      const preserved = previousByRole[slot.role].find(id => !used.has(id));
      const replacement = fallback.starters.find((id, fallbackIndex) => FORMATIONS[formation].layout[fallbackIndex].role === slot.role && !used.has(id));
      const id = preserved ?? replacement ?? '';
      if (id) used.add(id);
      return id;
    });
    setLineup({ formation, starters });
    setSelectedIndex(-1);
  };

  const assignPlayer = (player: Player) => {
    if (readOnly || selectedIndex < 0 || player.role !== slotRole) return;
    setLineup(current => {
      const next = [...current.starters];
      const otherIndex = next.indexOf(player.id);
      if (otherIndex >= 0) [next[selectedIndex], next[otherIndex]] = [next[otherIndex], next[selectedIndex]];
      else next[selectedIndex] = player.id;
      return { ...current, starters: next };
    });
    setSelectedIndex(-1);
  };

  return (
    <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 py-7 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <p className="section-heading">{team.name}</p>
        <h1 className="mt-2 font-display text-4xl sm:text-6xl font-black text-ink">{title}</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">{description}</p>
      </div>

      <section className="mt-7" aria-label="Moduli tattici">
        <h2 className="section-heading mb-3">Modulo</h2>
        <FormationPicker value={lineup.formation} onChange={chooseFormation} disabled={readOnly} />
      </section>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
        <section aria-label="Formazione sul campo">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="section-heading">Titolari · {lineup.formation}</h2>
            <span className="font-display text-xl font-black text-ink">Forza {strength}</span>
          </div>
          <LineupPitch players={players} lineup={lineup} selectedIndex={selectedIndex} onSelect={index => setSelectedIndex(index)} readOnly={readOnly} />
          <div className="mt-3 grid grid-cols-4 gap-2" aria-label="Forza dei reparti">
            {ROLE_ORDER.map(role => (
              <span key={role} className="flex items-center gap-1.5 border border-line-strong px-2 py-1 text-xs font-bold text-ink">
                <span className={`${ROLE_TAG[role]} !w-5 !h-5 !text-xs`}>{role}</span>
                {roleStrength[role]}
              </span>
            ))}
          </div>
        </section>

        <section aria-label="Giocatori disponibili">
          <div className="flex items-center justify-between border-b-2 border-ink pb-2">
            <h2 className="section-heading">Rosa</h2>
            <span className="text-sm font-semibold text-ink-muted">{starters.length}/8 titolari</span>
          </div>
          {selectedIndex >= 0 && slotRole ? (
            <div className="mt-3 border-2 border-ink bg-surface p-3">
              <p className="text-sm font-bold text-ink">Scegli un giocatore per: {ROLE_NAMES[slotRole]}</p>
              <button type="button" className="link-action mt-1 text-xs" onClick={() => setSelectedIndex(-1)}>Annulla selezione</button>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">Seleziona un posto sul campo per cambiare titolare.</p>
          )}
          <ul className="mt-2 divide-y divide-line">
            {players.map(player => {
              const starter = lineup.starters.includes(player.id);
              const compatible = selectedIndex >= 0 && player.role === slotRole;
              return (
                <li key={player.id}>
                  <button
                    type="button"
                    onClick={() => assignPlayer(player)}
                    disabled={!compatible || readOnly}
                    className={`flex w-full items-center gap-2 py-2 text-left ${compatible ? 'text-ink hover:bg-surface' : 'text-ink-muted'} disabled:cursor-default`}
                  >
                    <span className={`${ROLE_TAG[player.role]} !w-6 !h-6 !text-xs`}>{player.role}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{shortName(player.name)}</span>
                    <span className="text-sm tabular-nums">{playerOverall(player)}</span>
                    {starter && <span className="text-xs font-bold text-pitch">TITOLARE</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 border-t-2 border-ink pt-3">
            <h3 className="font-display text-xl font-extrabold text-ink">Riserve · {bench.length}</h3>
            <p className="mt-1 text-xs text-ink-muted">Non entreranno automaticamente durante la partita.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {bench.map(player => (
                <span key={player.id} className="inline-flex items-center gap-1 border border-line-strong px-2 py-1 text-xs font-semibold text-ink-soft">
                  <span className={`${ROLE_TAG[player.role]} !w-5 !h-5 !text-xs`}>{player.role}</span>
                  {shortName(player.name)}
                </span>
              ))}
              {bench.length === 0 && <span className="text-sm text-ink-muted">Nessuna riserva</span>}
            </div>
          </div>
        </section>
      </div>

      {validation.length > 0 && (
        <ul className="mt-5 border-2 border-danger px-4 py-3 text-sm font-semibold text-danger" role="alert">
          {validation.map((error, index) => <li key={`${error.code}-${index}`}>{error.message}</li>)}
        </ul>
      )}

      {sentLabel && <p className="mt-5 text-center font-semibold text-ink-soft" role="status">{sentLabel}</p>}
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Indietro</button>}
        <button type="button" className="btn-cta" disabled={validation.length > 0 || submitDisabled || readOnly} onClick={() => onConfirm(lineup)}>
          {submitLabel}
          <Icon name="arrow" className="h-6 w-6" />
        </button>
      </div>
    </main>
  );
}
