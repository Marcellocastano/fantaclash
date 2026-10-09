import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EntryScreen } from './EntryScreen';

describe('ingresso spettatore', () => {
  it('un click su "Guarda la stanza" entra come spettatore', async () => {
    const onJoin = vi.fn(async () => ({ ok: true }) as never);
    render(
      <EntryScreen
        initialView="entra"
        initialCode="ABCDE"
        initialSpectator
        hasIdentity={false}
        onCreate={async () => {}}
        onJoin={onJoin}
      />
    );
    fireEvent.click(screen.getByText('Guarda la stanza'));
    expect(onJoin).toHaveBeenCalledWith(expect.objectContaining({ code: 'ABCDE', role: 'spectator' }));
    // Nessun campo squadra richiesto
    expect(screen.queryByLabelText(/squadra/i)).toBeNull();
  });

  it('con identità salvata compare "Rientra nella stanza" (un click, ruolo player)', async () => {
    const onJoin = vi.fn(async () => ({ ok: true }) as never);
    render(
      <EntryScreen
        initialView="entra"
        initialCode="ABCDE"
        hasIdentity
        onCreate={async () => {}}
        onJoin={onJoin}
      />
    );
    fireEvent.click(screen.getByText('Rientra nella stanza'));
    expect(onJoin).toHaveBeenCalledWith(expect.objectContaining({ code: 'ABCDE', role: 'player' }));
  });
});

describe('esito del join nel form', () => {
  const renderJoin = (onJoin: ReturnType<typeof vi.fn>) =>
    render(
      <EntryScreen
        initialView="entra"
        initialCode="ABCDE"
        hasIdentity={false}
        onCreate={async () => {}}
        onJoin={onJoin}
      />
    );

  const joinAs = async (nick = 'Ospite') => {
    fireEvent.change(screen.getByLabelText('Nickname'), { target: { value: nick } });
    fireEvent.click(screen.getByRole('button', { name: /Entra nella stanza/i }));
  };

  it('name_taken: errore sul campo squadra', async () => {
    const onJoin = vi.fn(async () => ({ ok: false, reason: 'name_taken' }) as never);
    renderJoin(onJoin);
    await joinAs();
    await waitFor(() => expect(screen.getByText('Nome già in uso da un altro utente')).toBeInTheDocument());
    expect(screen.getByLabelText('Nome squadra')).toHaveAttribute('aria-invalid', 'true');
  });

  it('not_found: toast con il motivo', async () => {
    const onJoin = vi.fn(async () => ({ ok: false, reason: 'not_found' }) as never);
    renderJoin(onJoin);
    await joinAs();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Codice non corretto: nessuna stanza attiva con questo codice.')
    );
  });

  it('in attesa il pulsante mostra "Entro…"', async () => {
    const onJoin = vi.fn(() => new Promise(() => {}) as never);
    renderJoin(onJoin);
    await joinAs();
    await waitFor(() => expect(screen.getByRole('button', { name: /Entro…/ })).toBeDisabled());
  });
});
