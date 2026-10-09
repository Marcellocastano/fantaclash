import { ClientIntent, Envelope, HostMessage } from '../protocol';

/**
 * Trasporto della stanza: astratto, senza dipendenze.
 * Topologia: un downlink condiviso `room:<code>` (trasmette solo l'host)
 * più un uplink `room:<code>:up:<participantId>` per ogni partecipante
 * (solo lui e l'host). La Presence sta sul downlink.
 */

export interface PresenceEntry {
  id: string;
  role: 'host' | 'player' | 'spectator';
  /** Chiave pubblica JWK (l'host la pubblica qui) */
  pubKey?: JsonWebKey;
}

export type TransportRole = PresenceEntry['role'];

export interface TransportOptions {
  code: string;
  selfId: string;
  role: TransportRole;
  /** Chiave pubblica JWK pubblicata nella meta della presence */
  pubKey?: JsonWebKey;
}

export interface RoomTransport {
  /** Iscrive il downlink (+ uplink proprio se non host) e fa track della presence */
  connect(): Promise<void>;
  close(): Promise<void>;

  // lato partecipante
  /** Invia un intento sul proprio uplink (from = selfId) */
  sendIntent(env: Envelope<ClientIntent>): void;
  onHostMessage(cb: (env: Envelope<HostMessage>) => void): () => void;

  // lato host
  /** Trasmette sul downlink */
  broadcast(env: Envelope<HostMessage>): void;
  /** Iscrive l'host all'uplink di un partecipante */
  listenTo(participantId: string): Promise<void>;
  unlisten(participantId: string): Promise<void>;
  onIntent(cb: (env: Envelope<ClientIntent>) => void): () => void;

  // entrambi: lista completa delle presenze a ogni sync
  onPresence(cb: (entries: PresenceEntry[]) => void): () => void;
}
