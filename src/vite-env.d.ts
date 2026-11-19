/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_FLIGHT_SEARCH_MODE?: 'backend' | 'mock';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
