/** Nome do ficheiro em `politicas/` (raiz do repo) para cada tipo e versão. */
export function policyMarkdownFilename(
  kind: "terms" | "privacy",
  version: string
): string {
  if (kind === "terms") return `termos-de-uso-${version}.md`;
  return `politica-de-privacidade-${version}.md`;
}
