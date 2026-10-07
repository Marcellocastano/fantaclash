interface AttackIndicatorProps {
  /** Posizione del pallone dal motore (MatchTick.ball): -1 porta di casa, +1 porta ospite */
  ball: number;
  /** Durata dello spostamento tra due minuti (segue la velocità di riproduzione) */
  transitionMs: number;
  homeIsUser: boolean;
}

/**
 * Indicatore d'attacco sul fondo della fascia del tabellone: dove si trova
 * il pallone lungo il campo. La casa attacca verso destra, come sul campo;
 * con un gol il punto tocca la fine dell'indicatore. Lo spostamento dura
 * poco più di un minuto di riproduzione, così il pallone scorre senza salti.
 */
export function AttackIndicator({ ball, transitionMs, homeIsUser }: AttackIndicatorProps) {
  const b = Math.max(-1, Math.min(1, ball));
  const pos = 50 + b * 50;
  const attacking = b > 0.05 ? 'home' : b < -0.05 ? 'away' : null;
  const userAttacking = attacking !== null && (attacking === 'home') === homeIsUser;
  const color = attacking === null ? 'bg-canvas' : userAttacking ? 'bg-highlight' : 'bg-whistle';
  const goal = Math.abs(b) >= 0.999;
  // Transizione lineare un po' più lunga di un minuto di riproduzione: ogni
  // nuovo target riparte dalla posizione corrente, quindi il punto scorre
  // con continuità senza fermarsi a ogni minuto né scattare
  const transition = { transitionDuration: `${Math.round(transitionMs * 1.4)}ms`, transitionTimingFunction: 'linear' };

  return (
    <div className="relative h-2 bg-canvas/15" role="img" aria-label={attacking ? `Attacca ${attacking === 'home' ? 'la squadra di casa' : 'la squadra ospite'}` : 'Gioco a centrocampo'}>
      {/* Porte e centrocampo */}
      <span className={`absolute left-0 -top-1.5 -bottom-1.5 w-1.5 ${goal && b < 0 ? color : 'bg-canvas/40'}`} />
      <span className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-canvas/40" />
      <span className={`absolute right-0 -top-1.5 -bottom-1.5 w-1.5 ${goal && b > 0 ? color : 'bg-canvas/40'}`} />
      {/* Avanzamento dal centrocampo verso la porta attaccata */}
      <span
        className={`absolute top-0 bottom-0 ${color} opacity-50 transition-[left,width]`}
        style={{ left: `${Math.min(50, pos)}%`, width: `${Math.abs(pos - 50)}%`, ...transition }}
      />
      <span
        className={`absolute top-1/2 w-5 h-5 -mt-2.5 -ml-2.5 rounded-full border-2 border-ink ${color} transition-[left]`}
        style={{ left: `${pos}%`, ...transition }}
      />
    </div>
  );
}
