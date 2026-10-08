import { LocalAuctionProvider } from '../../hooks/auctionController';
import { AuctionRoom } from '../auction/AuctionRoom';

/** Fase ASTA del gioco singolo: provider del controller + stanza (chunk lazy) */
export default function AuctionPhase({ onComplete }: { onComplete: () => void }) {
  return (
    <LocalAuctionProvider>
      <AuctionRoom onComplete={onComplete} />
    </LocalAuctionProvider>
  );
}
