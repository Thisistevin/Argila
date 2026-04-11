import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("[smoke] M1", () => {
  it("código fonte do cliente não expõe ANTHROPIC_API_KEY em page.tsx raiz", () => {
    const p = path.join(process.cwd(), "app", "page.tsx");
    const src = readFileSync(p, "utf-8");
    expect(src).not.toContain("ANTHROPIC_API_KEY");
  });

  it("tokens importam design-system relativo", () => {
    const p = path.join(process.cwd(), "app", "globals.css");
    const src = readFileSync(p, "utf-8");
    expect(src).toContain("design-system/tokens.css");
  });
});
