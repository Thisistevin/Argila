# Políticas Legais — Argila

Esta pasta contém os **modelos** de Termos de Uso e Política de Privacidade (com cláusulas de LGPD) do Argila, versão `v1`.

## Arquivos

- [`termos-de-uso-v1.md`](./termos-de-uso-v1.md) — texto dos Termos de Uso.
- [`politica-de-privacidade-v1.md`](./politica-de-privacidade-v1.md) — texto da Política de Privacidade, incluindo cláusulas específicas de LGPD.
- `termos-de-uso-v1.pdf` e `politica-de-privacidade-v1.pdf` — versões em PDF geradas a partir dos markdown para leitura e distribuição.

## Status destes documentos

**São templates iniciais, não textos juridicamente aprovados.** Antes de publicar:

1. Preencher todos os placeholders entre colchetes:
   - `[RAZÃO SOCIAL]`, `[CNPJ]`, `[ENDEREÇO COMPLETO]`
   - `[NOME DO DPO]`, `[dpo@argila.app]`, `[contato@argila.app]`
   - `[CIDADE / UF]` (foro)
   - `[DATA DE PUBLICAÇÃO]` em cada cabeçalho e no histórico de versões.
2. Submeter à revisão de advogado(a) com especialidade em LGPD, direito digital e direito do consumidor antes de colocar em produção.
3. Confirmar se o Asaas e demais operadores continuam sendo os mesmos mencionados; atualizar a tabela de compartilhamento conforme necessário.
4. Confirmar que os prazos de retenção informados (90 dias para downgrade e exclusão de conta; 6 meses para logs; 5 anos para documentos fiscais) estão coerentes com as decisões operacionais atuais.

## Como esses arquivos se integram ao app

A versão `v1` casa com a chave `legal_current_versions` do `app_settings` definida no plano de billing:

```json
{ "terms": "v1", "privacy": "v1" }
```

Quando o texto for atualizado:

1. Criar novo arquivo versionado (ex: `termos-de-uso-v2.md`) preservando o anterior por auditoria.
2. Registrar a mudança no bloco "Histórico de versões" do documento novo.
3. Atualizar `app_settings.legal_current_versions` via migration ou UI administrativa.
4. Comunicar usuários ativos conforme o item 12 dos Termos / item 13 da Política.

## Como regenerar os PDFs

Os PDFs foram gerados a partir do markdown pelo script `gerar-pdfs.sh` nesta pasta, usando o Google Chrome em modo headless. Para regerar:

```sh
./politicas/gerar-pdfs.sh
```

Os PDFs são saída — sempre edite o markdown, não o PDF.
