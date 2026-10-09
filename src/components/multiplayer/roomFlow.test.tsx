import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { RoomProvider } from './RoomProvider';
import { MultiplayerApp } from './MultiplayerApp';
import { MultiplayerPage } from '../../site/pages/MultiplayerPage';
import { createMemoryNetwork } from '../../multiplayer/transport/memory';
import { TransportOptions } from '../../multiplayer/transport/types';
import { createRng } from '../../services/auction';

// jsdom qui non espone localStorage: identità distinte per partecipante
let idSeq = 0;
vi.mock('../../multiplayer/identity', async () => {
  const { generateRoomKeyPair } = await import('../../multiplayer/crypto');
  return {
    getRoomIdentity: () => ({ participantId: `id-${++idSeq}`, token: `tok-${idSeq}` }),
    ensureRoomIdentity: async () => ({
      participantId: `id-${++idSeq}`,
      token: `tok-${idSeq}`,
      keyPair: await generateRoomKeyPair(),
    }),
    savedRoomIdentity: () => null,
    clearRoomIdentity: vi.fn(),
  };
});

const SEASONS = [{ season: '2015-16', label: 'Serie A 2015-16', playerCount: 96 }];

const net = () => createMemoryNetwork({ rng: createRng(7), latency: { min: 1, max: 10 }, dropRate: 0 });

const factory = (n: ReturnType<typeof net>) => async (opts: TransportOptions) => n.createTransport(opts);

function renderApp(n: ReturnType<typeof net>) {
  return render(
    <RoomProvider transportFactory={factory(n)}>
      <MultiplayerApp />
    </RoomProvider>
  );
}

describe('multiplayer UI su rete in memoria', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => SEASONS })));
    window.history.replaceState(null, '', '/multiplayer/');
  });

  it('flag spento: pagina con avviso "non ancora disponibile"', () => {
    render(<MultiplayerPage />);
    expect(screen.getByText(/non ancora disponibile/i)).toBeInTheDocument();
  });

  it('host crea stanza, un giocatore entra, pronto, espulsione e condizioni di avvio', async () => {
    const shared = net();
    // --- host ---
    const hostApp = renderApp(shared);
    await waitFor(() => expect(hostApp.getByLabelText('Nickname')).toBeInTheDocument());
    fireEvent.change(hostApp.getByLabelText('Nickname'), { target: { value: 'Hostu' } });
    // due elementi "Crea stanza": la scheda e il pulsante del form
    // (abilitato quando l'indice delle stagioni è arrivato)
    await waitFor(() =>
      expect(hostApp.getAllByRole('button', { name: 'Crea stanza' })[1]).not.toBeDisabled()
    );
    fireEvent.click(hostApp.getAllByRole('button', { name: 'Crea stanza' })[1]);

    const hostView = within(hostApp.container);
    // lobby dell'host con il codice
    let code = '';
    await waitFor(() => {
      const m = window.location.search.match(/codice=([A-Z0-9]{5})/);
      expect(m).toBeTruthy();
      code = m![1];
    }, { timeout: 5000 });
    expect(hostView.getByText('Giocatori 1/8', { exact: false })).toBeInTheDocument();
    expect(hostView.getByText(/Tieni aperta questa scheda/)).toBeInTheDocument();

    // --- ospite ---
    const guestApp = renderApp(shared);
    const guest = within(guestApp.container);
    await waitFor(() => expect(guest.getByText('Entra con codice')).toBeInTheDocument());
    // l'URL porta già il codice: scheda "entra" attiva
    fireEvent.change(guest.getByLabelText('Nickname'), { target: { value: 'Ospite' } });
    const codeInput = guest.getByLabelText('Codice stanza') as HTMLInputElement;
    expect(codeInput.value).toBe(code);
    fireEvent.click(guest.getByRole('button', { name: /Entra nella stanza/i }));

    await waitFor(() => expect(guest.getByText('Giocatori 2/8', { exact: false })).toBeInTheDocument(), { timeout: 5000 });
    await waitFor(() => expect(hostView.getByText('Giocatori 2/8', { exact: false })).toBeInTheDocument());
    expect(hostView.getByText('Ospite')).toBeInTheDocument();

    // avvio: in DEV basta l'host; i posti liberi vanno sempre ai bot -> abilitato
    const startBtn = hostView.getByRole('button', { name: /Avvia l.asta/i }) as HTMLButtonElement;
    expect(startBtn.disabled).toBe(false);

    // espulsione: l'host espelle l'ospite
    fireEvent.click(hostView.getByRole('button', { name: 'Espelli' }));
    await waitFor(() => expect(guest.getByText(/espulso dalla stanza/i)).toBeInTheDocument(), { timeout: 3000 });
    await waitFor(() => expect(hostView.getByText('Giocatori 1/8', { exact: false })).toBeInTheDocument());
  }, 20000);

  it('nome squadra già in uso: errore sul campo, si resta nel form', async () => {
    const shared = net();
    const hostApp = renderApp(shared);
    await waitFor(() => expect(hostApp.getByLabelText('Nickname')).toBeInTheDocument());
    fireEvent.change(hostApp.getByLabelText('Nickname'), { target: { value: 'Hostu' } });
    fireEvent.change(hostApp.getByLabelText('La tua squadra'), { target: { value: 'Cacca FC' } });
    await waitFor(() => expect(hostApp.getAllByRole('button', { name: 'Crea stanza' })[1]).not.toBeDisabled());
    fireEvent.click(hostApp.getAllByRole('button', { name: 'Crea stanza' })[1]);
    await waitFor(() => expect(window.location.search).toMatch(/codice=[A-Z0-9]{5}/), { timeout: 5000 });

    const guestApp = renderApp(shared);
    const guest = within(guestApp.container);
    await waitFor(() => expect(guest.getByLabelText('Nickname')).toBeInTheDocument());
    fireEvent.change(guest.getByLabelText('Nickname'), { target: { value: 'Ospite' } });
    fireEvent.change(guest.getByLabelText('Nome squadra'), { target: { value: 'Cacca FC' } });
    fireEvent.click(guest.getByRole('button', { name: /Entra nella stanza/i }));

    // REJECT name_taken: errore sul campo squadra, niente schermate intermedie
    await waitFor(() => expect(guest.getByText('Nome già in uso da un altro utente')).toBeInTheDocument(), { timeout: 5000 });
    expect(guest.queryByText('Stanza non trovata')).toBeNull();
    expect(guest.queryByText('Non sei entrato')).toBeNull();
    expect(guest.getByLabelText('Codice stanza')).toBeInTheDocument();

    // nome diverso: si entra in lobby
    fireEvent.change(guest.getByLabelText('Nome squadra'), { target: { value: 'Altra FC' } });
    fireEvent.click(guest.getByRole('button', { name: /Entra nella stanza/i }));
    await waitFor(() => expect(guest.getByText('Giocatori 2/8', { exact: false })).toBeInTheDocument(), { timeout: 5000 });
  }, 20000);

  it("leave dopo l'ingresso: si torna al form (mai 'Stanza non trovata')", async () => {
    const shared = net();
    const hostApp = renderApp(shared);
    await waitFor(() => expect(hostApp.getByLabelText('Nickname')).toBeInTheDocument());
    fireEvent.change(hostApp.getByLabelText('Nickname'), { target: { value: 'Hostu' } });
    await waitFor(() => expect(hostApp.getAllByRole('button', { name: 'Crea stanza' })[1]).not.toBeDisabled());
    fireEvent.click(hostApp.getAllByRole('button', { name: 'Crea stanza' })[1]);
    await waitFor(() => expect(window.location.search).toMatch(/codice=[A-Z0-9]{5}/), { timeout: 5000 });

    const guestApp = renderApp(shared);
    const guest = within(guestApp.container);
    await waitFor(() => expect(guest.getByLabelText('Nickname')).toBeInTheDocument());
    fireEvent.change(guest.getByLabelText('Nickname'), { target: { value: 'Ospite' } });
    fireEvent.click(guest.getByRole('button', { name: /Entra nella stanza/i }));
    await waitFor(() => expect(guest.getByText('Giocatori 2/8', { exact: false })).toBeInTheDocument(), { timeout: 5000 });

    // Esci dalla lobby: la close() emette 'closed' ma la sessione è stantia
    fireEvent.click(guest.getByRole('button', { name: 'Esci dalla stanza' }));
    // secondo "Esci dalla stanza": il bottone di conferma del dialogo
    fireEvent.click(guest.getAllByRole('button', { name: 'Esci dalla stanza' })[1]);
    await waitFor(() => expect(guest.getByLabelText('Nickname')).toBeInTheDocument(), { timeout: 5000 });
    expect(guest.queryByText('Stanza non trovata')).toBeNull();
  }, 20000);

});
