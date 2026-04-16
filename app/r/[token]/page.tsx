import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

function renderInlineBold(text: string): ReactNode[] {
  return text.split(/(\*[^*\n]+\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <strong key={index}>{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

function renderPublicReport(content: string | null) {
  const source = (content ?? "").trim();
  if (!source) return null;

  return source.split(/\n{2,}/).map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("## ")) {
      return (
        <h2
          key={index}
          className="text-lg font-bold"
          style={{ color: "var(--argila-darkest)", marginTop: index === 0 ? 0 : "1.75rem", marginBottom: "0.75rem" }}
        >
          {renderInlineBold(trimmed.slice(3))}
        </h2>
      );
    }

    return (
      <p
        key={index}
        className="text-base leading-8"
        style={{ color: "var(--color-text-sec)", marginBottom: "1.25rem" }}
      >
        {trimmed.split("\n").map((line, lineIndex) => (
          <span key={lineIndex}>
            {lineIndex > 0 && <br />}
            {renderInlineBold(line)}
          </span>
        ))}
      </p>
    );
  });
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    notFound();
  }
  const { data, error } = await admin
    .from("reports")
    .select("title, subtitle, content, period_start, period_end")
    .eq("share_token", token)
    .eq("status", "published")
    .single();
  if (error || !data) notFound();

  return (
    <div
      className="min-h-screen p-8 max-w-2xl mx-auto"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--argila-darkest)" }}>
        {data.title ?? "Relatório"}
      </h1>
      {data.subtitle && (
        <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
          {data.subtitle}
        </p>
      )}
      <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
        Período: {data.period_start} — {data.period_end}
      </p>
      <article style={{ fontFamily: "var(--font-primary)" }}>
        {renderPublicReport(data.content)}
      </article>
    </div>
  );
}
