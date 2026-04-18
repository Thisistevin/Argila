import type { ReactNode } from "react";

/** Renderização mínima de markdown (cabeçalhos e parágrafos) para páginas jurídicas. */
export function MarkdownLite({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "---") {
      blocks.push(
        <hr
          key={`hr-${i}`}
          className="my-6 border-0 border-t"
          style={{ borderColor: "var(--color-border)" }}
        />
      );
      i += 1;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1
          key={`h1-${i}`}
          className="mb-3 text-2xl font-bold"
          style={{ color: "var(--argila-darkest)" }}
        >
          {line.slice(2)}
        </h1>
      );
      i += 1;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2
          key={`h2-${i}`}
          className="mt-8 mb-2 text-lg font-semibold"
          style={{ color: "var(--argila-darkest)" }}
        >
          {line.slice(3)}
        </h2>
      );
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3
          key={`h3-${i}`}
          className="mt-5 mb-2 text-base font-semibold"
          style={{ color: "var(--argila-darkest)" }}
        >
          {line.slice(4)}
        </h3>
      );
      i += 1;
      continue;
    }
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith("- ")) {
        items.push((lines[i] ?? "").slice(2));
        i += 1;
      }
      blocks.push(
        <ul
          key={`ul-${blocks.length}`}
          className="mb-4 list-disc space-y-1 pl-5 text-sm leading-relaxed"
          style={{ color: "var(--color-text-sec)" }}
        >
          {items.map((t, k) => (
            <li key={k}>{inlineBold(t)}</li>
          ))}
        </ul>
      );
      continue;
    }
    let para = line;
    i += 1;
    while (i < lines.length) {
      const next = lines[i] ?? "";
      if (
        next.trim() === "" ||
        next.startsWith("#") ||
        next.trim() === "---"
      ) {
        break;
      }
      para += "\n" + next;
      i += 1;
    }
    blocks.push(
      <p
        key={`p-${blocks.length}`}
        className="mb-3 text-sm leading-relaxed"
        style={{ color: "var(--color-text-sec)" }}
      >
        {inlineBold(para)}
      </p>
    );
  }
  return <div className="max-w-3xl">{blocks}</div>;
}

function inlineBold(text: string): ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  if (parts.length === 1) return text;
  const out: ReactNode[] = [];
  for (let j = 0; j < parts.length; j++) {
    if (j % 2 === 1) {
      out.push(
        <strong key={j} style={{ color: "var(--argila-darkest)" }}>
          {parts[j]}
        </strong>
      );
    } else if (parts[j]) {
      out.push(parts[j]);
    }
  }
  return out;
}
