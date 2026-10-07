import { AuctionBid, Team } from '../../types';
import { Icon } from '../Icon';

interface BidHistoryProps {
  bids: AuctionBid[];
  userTeamId: string;
  teams: Team[];
}

/**
 * Cronologia rilanci
 */
export function BidHistory({ bids, userTeamId, teams }: BidHistoryProps) {
  if (bids.length === 0) return null;

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || 'Sconosciuto';
  };

  // Mostra ultimi 5 rilanci
  const recentBids = bids.slice(-5).reverse();

  return (
    <div>
      <h3 className="section-heading mb-1">Cronologia rilanci</h3>
      <div className="divide-y divide-line">
        {recentBids.map((bid, index) => {
          const isUser = bid.teamId === userTeamId;
          const isWinning = index === 0;
          
          return (
            <div 
              key={`${bid.teamId}-${bid.amount}-${index}`}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-2">
                {isWinning && (
                  <Icon name="check" className="w-4 h-4 text-ok" />
                )}
                <span title={isUser ? 'Tu' : getTeamName(bid.teamId)} className={`font-medium min-w-0 truncate ${isUser ? 'text-pitch font-semibold' : isWinning ? 'text-ink' : 'text-ink-muted'}`}>
                  {isUser ? 'Tu' : getTeamName(bid.teamId)}
                </span>
              </div>
              
              <span className={`font-display font-bold tabular-nums shrink-0 ${isWinning ? 'text-ok' : 'text-ink-muted'}`}>
                +{bid.amount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
