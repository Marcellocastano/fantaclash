import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntryScreen } from './EntryScreen';

describe('ingresso spettatore', () => {
  it('un click su "Guarda la stanza" entra come spettatore', async () => {
    const onJoin = vi.fn(async () => {});
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
});
