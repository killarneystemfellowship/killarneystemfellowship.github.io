/*
 * STEMQuest runtime configuration.
 *
 * The Supabase URL and anon key are intentionally blank. When both values are
 * supplied, storage.js uses the Supabase REST API. Otherwise it uses the
 * browser's localStorage so the prototype works immediately.
 *
 * A Supabase anon key is designed to be public in a browser. Never place a
 * service-role key, database password, or live Supabase organizer PIN here.
 * LOCAL_ORGANIZER_PIN is only a same-browser preview convenience and provides
 * no security; remote organizer PINs are stored as hashes in PostgreSQL.
 */
window.STEMQUEST_CONFIG = Object.freeze({
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  SUPABASE_SCHEMA: "public",
  DEFAULT_CLASS_CODE: "DNA-DEMO",
  LOCAL_ORGANIZER_PIN: "2468",
  REQUEST_TIMEOUT_MS: 12000,
});
