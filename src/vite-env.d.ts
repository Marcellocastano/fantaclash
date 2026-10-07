/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Pagina di supporto al progetto (vedi src/config.ts) */
  readonly VITE_SUPPORT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
