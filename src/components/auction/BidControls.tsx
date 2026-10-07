import { Icon } from '../Icon';

interface BidControlsProps {
  currentBid: number;
  userCredits: number;
  userMaxBid: number;
  canBid: boolean;
  isUserWinning: boolean;
  onBid: (amount: number) => void;
}

/**
 * Controlli per fare offerte
 */
export function BidControls({
  currentBid,
  userCredits,
  userMaxBid,
  canBid,
  isUserWinning,
  onBid,
}: BidControlsProps) {
  const bidIncrements = [1, 5, 10];

  if (!canBid) {
    return (
      <div className="border-t border-line pt-4">
        <p className="text-ink-soft">
          Hai già completato questo reparto.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-line pt-4">
      {/* Info crediti */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="block text-xs font-medium text-ink-muted">Budget</span>
          <span className="font-display text-xl font-bold text-ink tabular-nums">{userCredits} Cr</span>
        </div>
        <div className="text-right">
          <span className="block text-xs font-medium text-ink-muted">Max rilancio</span>
          <span className="font-display text-xl font-bold text-pitch tabular-nums">{userMaxBid} Cr</span>
        </div>
      </div>

      {/* Pulsanti rilancio */}
      <div className="flex gap-2 mb-4">
        {bidIncrements.map((increment) => {
          const newBid = currentBid + increment;
          const canAfford = newBid <= userMaxBid;
          
          return (
            <button
              key={increment}
              onClick={() => onBid(newBid)}
              disabled={!canAfford}
              className="btn-bid flex-1"
            >
              +{increment}
            </button>
          );
        })}
      </div>

      {/* Stato */}
      {isUserWinning ? (
        <p className="flex items-center gap-2 text-ok text-sm font-medium">
          <Icon name="check" className="w-4 h-4" />
          Sei in testa. Aspetta che scada il timer.
        </p>
      ) : (
        <p className="text-ink-soft text-sm">
          Rilancia per aggiudicarti il giocatore.
        </p>
      )}
    </div>
  );
}
