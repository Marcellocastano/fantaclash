/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Pagina di supporto al progetto (vedi src/config.ts) */
  readonly VITE_SUPPORT_URL?: string;
  /** Codice dell'account GoatCounter (vedi src/config.ts) */
  readonly VITE_GOATCOUNTER_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
