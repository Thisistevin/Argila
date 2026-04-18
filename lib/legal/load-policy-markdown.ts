import fs from "node:fs/promises";
import path from "node:path";

/** Lê markdown de `politicas/` na raiz do monorepo (pasta acima de `argila/`). */
export async function loadPolicyMarkdownFile(filename: string): Promise<string> {
  const filePath = path.join(process.cwd(), "politicas", filename);
  return fs.readFile(filePath, "utf-8");
}
