import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

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
      <article
        className="prose prose-sm max-w-none whitespace-pre-wrap"
        style={{ fontFamily: "var(--font-primary)" }}
      >
        {data.content}
      </article>
    </div>
  );
}
