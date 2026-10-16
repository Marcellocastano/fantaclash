import { describe, it, expect } from 'vitest';
import { isCapacityError } from './errors';

describe('isCapacityError', () => {
  it('riconosce errori di capacità Realtime', () => {
    expect(isCapacityError(new Error('too_many_connections'))).toBe(true);
    expect(isCapacityError(new Error('canale room:ABC: CHANNEL_ERROR quota exceeded'))).toBe(true);
    expect(isCapacityError(new Error('Realtime connection limit reached'))).toBe(true);
    expect(isCapacityError(new Error('subscribe TIMED_OUT'))).toBe(true);
  });

  it('non confonde errori ordinari', () => {
    expect(isCapacityError(new Error('LISTENING non ricevuto entro 10s'))).toBe(false);
    expect(isCapacityError(new Error('stanza chiusa'))).toBe(false);
    expect(isCapacityError('stringa')).toBe(false);
    expect(isCapacityError(undefined)).toBe(false);
    expect(isCapacityError(null)).toBe(false);
  });
});
