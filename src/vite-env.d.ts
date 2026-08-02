/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/info" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  readonly VITE_BASE_PATH?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_FEATURE_LEADERSHIP?: string
  readonly VITE_PUSH_ENABLED?: string
  readonly VITE_PUSH_FUNCTION_URL?: string
  readonly VITE_PUSH_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
