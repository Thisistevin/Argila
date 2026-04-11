/**
 * Resolução de variáveis Supabase com fallback legado → compatível com
 * cloud (publishable/secret) e local (`supabase start`: só anon/service_role).
 * @see https://supabase.com/docs/guides/api/api-keys
 */

function trim(s: string | undefined): string {
  return (s ?? "").trim();
}

/** URL do projeto (sempre a URL HTTPS, nunca uma chave). */
export function getSupabaseUrl(): string {
  const url =
    trim(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    trim(process.env.SUPABASE_URL);
  if (!url) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL no servidor)."
    );
  }
  return url;
}

/**
 * Chave pública: publishable (`sb_publishable_...`) ou anon JWT.
 * Ordem: publishable → anon (obrigatório em CLI/local).
 */
export function getSupabasePublicApiKey(): string {
  const key =
    trim(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!key) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return key;
}

/**
 * Chave privilegiada: secret (`sb_secret_...`) ou service_role JWT.
 * Somente servidor — nunca expor ao cliente.
 */
export function getSupabaseSecretApiKey(): string {
  const key =
    trim(process.env.SUPABASE_SECRET_KEY) ||
    trim(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!key) {
    throw new Error(
      "Defina SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return key;
}

/** URL do projeto de testes (integração). */
export function getSupabaseTestUrl(): string {
  const url = trim(process.env.SUPABASE_TEST_URL);
  if (!url) {
    throw new Error("Defina SUPABASE_TEST_URL.");
  }
  return url;
}

/**
 * Chave pública de teste: publishable → anon (espelha produção; local = só anon).
 */
export function getSupabaseTestPublicApiKey(): string {
  const key =
    trim(process.env.SUPABASE_TEST_PUBLISHABLE_KEY) ||
    trim(process.env.SUPABASE_TEST_ANON_KEY);
  if (!key) {
    throw new Error(
      "Defina SUPABASE_TEST_PUBLISHABLE_KEY ou SUPABASE_TEST_ANON_KEY."
    );
  }
  return key;
}

/**
 * Chave privilegiada de teste: secret → service_role.
 */
export function getSupabaseTestSecretApiKey(): string {
  const key =
    trim(process.env.SUPABASE_TEST_SECRET_KEY) ||
    trim(process.env.SUPABASE_TEST_SERVICE_ROLE_KEY);
  if (!key) {
    throw new Error(
      "Defina SUPABASE_TEST_SECRET_KEY ou SUPABASE_TEST_SERVICE_ROLE_KEY."
    );
  }
  return key;
}
