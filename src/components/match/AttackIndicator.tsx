interface AttackIndicatorProps {
  homeName: string;
  awayName: string;
  /** Posizione del pallone dal motore (MatchTick.ball): -1 porta di casa, +1 porta ospite */
  ball: number;
  /** Durata dello spostamento tra due minuti (segue la velocità di riproduzione) */
  transitionMs: number;
  homeIsUser: boolean;
  awayIsUser: boolean;
}

/**
 * Indicatore d'attacco: dove si trova il pallone lungo il campo. La casa
 * attacca verso destra, come sul campo; il centro è il centrocampo e con
 * un gol il punto tocca la fine dell'indicatore. Lo spostamento dura
 * poco più di un minuto di riproduzione, così il pallone scorre senza salti.
 */
export function AttackIndicator({ homeName, awayName, ball, transitionMs, homeIsUser, awayIsUser }: AttackIndicatorProps) {
  const b = Math.max(-1, Math.min(1, ball));
  const pos = 50 + b * 50;
  const attacking = b > 0.05 ? 'home' : b < -0.05 ? 'away' : null;
  const userAttacking = (attacking === 'home' && homeIsUser) || (attacking === 'away' && awayIsUser);
  const color = attacking === null ? 'bg-ink-soft' : userAttacking ? 'bg-pitch' : 'bg-ink';
  const goal = Math.abs(b) >= 0.999;
  // Transizione lineare un po' più lunga di un minuto di riproduzione: ogni
  // nuovo target riparte dalla posizione corrente, quindi il punto scorre
  // con continuità senza fermarsi a ogni minuto né scattare
  const transition = { transitionDuration: `${Math.round(transitionMs * 1.4)}ms`, transitionTimingFunction: 'linear' };

  return (
    <div className="py-3" role="img" aria-label={attacking ? `Attacca ${attacking === 'home' ? homeName : awayName}` : 'Gioco a centrocampo'}>
      <div className="flex items-center gap-3">
        <span className={`w-28 truncate text-sm font-semibold ${attacking === 'home' ? 'text-ink' : 'text-ink-muted'}`}>{homeName}</span>
        <div className="relative flex-1 h-2 bg-line">
          {/* Porte e centrocampo */}
          <span className={`absolute -left-1 -top-1.5 -bottom-1.5 w-1 ${goal && b < 0 ? color : 'bg-line-strong'}`} />
          <span className="absolute top-0 bottom-0 left-1/2 w-px bg-line-strong" />
          <span className={`absolute -right-1 -top-1.5 -bottom-1.5 w-1 ${goal && b > 0 ? color : 'bg-line-strong'}`} />
          {/* Avanzamento dal centrocampo verso la porta attaccata */}
          <span
            className={`absolute top-0 bottom-0 ${color} opacity-40 transition-[left,width]`}
            style={{ left: `${Math.min(50, pos)}%`, width: `${Math.abs(pos - 50)}%`, ...transition }}
          />
          <span
            className={`absolute top-1/2 w-4 h-4 -mt-2 -ml-2 border-2 border-canvas ${color} transition-[left]`}
            style={{ left: `${pos}%`, borderRadius: '50%', ...transition }}
          />
        </div>
        <span className={`w-28 truncate text-right text-sm font-semibold ${attacking === 'away' ? 'text-ink' : 'text-ink-muted'}`}>{awayName}</span>
      </div>
    </div>
  );
}
