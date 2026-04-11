# Argila — app (Next.js 16)

Implementação do MVP conforme `../PLANO_EXECUCAO_ARGILA.md`.

## Setup

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha (Supabase, Anthropic, crons, gateways).

### Variáveis Supabase (cloud vs local)

| Ambiente | Recomendado |
|----------|-------------|
| **Supabase cloud (atual)** | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY` (aba API Keys no dashboard). |
| **Legado cloud** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` (aba Legacy API Keys). |
| **`supabase start` / CLI** | Apenas **anon** + **service_role** — chaves `sb_publishable_` / `sb_secret_` **não existem** no local. |

O código aceita **fallback automático**: publishable → anon; secret → service_role. Basta definir **um par** consistente (novo ou legado) + `NEXT_PUBLIC_SUPABASE_URL`.

Documentação Supabase: [API keys](https://supabase.com/docs/guides/api/api-keys), [Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs).
3. Aplique migrations em `supabase/migrations/` no projeto Supabase (CLI ou SQL Editor).
4. No Supabase: habilitar Auth (magic link + Google), URL de redirect `https://<domínio>/auth/callback`.
5. `npm run dev` — app em [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel Pro)

- Conectar repositório; raiz do projeto no Vercel = pasta **`argila/`** (se o repo incluir design-system na raiz, configure *Root Directory* = `argila`).
- Variáveis de ambiente iguais ao `.env.example`.
- Crons: agendar GET em `/api/cron/process-ai-jobs`, `/api/cron/attention-check`, `/api/cron/billing-check` com header `Authorization: Bearer <CRON_SECRET>`.

## Testes

- `npm test` — smoke M1 e checagens locais.
- Testes de integração com Supabase local: definir `SUPABASE_TEST_URL` e chaves de teste (`SUPABASE_TEST_ANON_KEY` + `SUPABASE_TEST_SERVICE_ROLE_KEY`, ou publishable/secret se usar projeto cloud dedicado a testes).

## Documentação externa

Configuração Asaas/Abacatepay/Supabase: `../GUIA_CONFIGURACOES_EXTERNAS_ARGILA.md` (raiz do repositório).
