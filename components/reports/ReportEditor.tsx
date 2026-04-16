"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  publishReport,
  saveReportDraft,
} from "@/actions/reports";
import { Loader2, Save, Send, ExternalLink } from "lucide-react";

type ReportRow = {
  id: string;
  student_id: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  status: string;
  share_token: string | null;
  highlights: unknown;
  suggestions: unknown;
};

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export function ReportEditor({ report }: { report: ReportRow }) {
  const router = useRouter();
  const [title, setTitle] = useState(report.title ?? "");
  const [subtitle, setSubtitle] = useState(report.subtitle ?? "");
  const [content, setContent] = useState(report.content ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const highlights = asStringList(report.highlights);
  const suggestions = asStringList(report.suggestions);
  const published = report.status === "published";
  const shareToken = report.share_token;

  const onSave = () => {
    setMessage(null);
    startTransition(async () => {
      const r = await saveReportDraft(report.id, { title, subtitle, content });
      setMessage(
        r.ok ? "Alterações guardadas." : "Não foi possível guardar."
      );
      if (r.ok) router.refresh();
    });
  };

  const onPublish = () => {
    setMessage(null);
    startTransition(async () => {
      const r = await publishReport(report.id);
      if (r.ok) {
        setMessage("Relatório publicado. Link de partilha disponível abaixo.");
        router.refresh();
      } else {
        setMessage("Não foi possível publicar.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {(highlights.length > 0 || suggestions.length > 0) && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-bg-2)",
          }}
        >
          {highlights.length > 0 && (
            <div className="mb-3">
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--color-text-subtle)" }}
              >
                Destaques (IA)
              </p>
              <ul className="list-disc pl-4 space-y-1" style={{ color: "var(--color-text-muted)" }}>
                {highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}
          {suggestions.length > 0 && (
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--color-text-subtle)" }}
              >
                Sugestões (IA)
              </p>
              <ul className="list-disc pl-4 space-y-1" style={{ color: "var(--color-text-muted)" }}>
                {suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label
          className="text-xs font-semibold"
          style={{ color: "var(--argila-darkest)" }}
          htmlFor="report-title"
        >
          Título
        </label>
        <input
          id="report-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="argila-input w-full rounded-lg border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-bg)",
          }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          className="text-xs font-semibold"
          style={{ color: "var(--argila-darkest)" }}
          htmlFor="report-subtitle"
        >
          Subtítulo
        </label>
        <input
          id="report-subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className="argila-input w-full rounded-lg border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-bg)",
          }}
          placeholder="Ex.: Prof. Nome"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          className="text-xs font-semibold"
          style={{ color: "var(--argila-darkest)" }}
          htmlFor="report-content"
        >
          Conteúdo (Markdown)
        </label>
        <textarea
          id="report-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={18}
          className="argila-input w-full rounded-lg border px-3 py-2 text-sm font-mono leading-relaxed"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-bg)",
          }}
        />
      </div>

      {message && (
        <p className="text-sm" style={{ color: "var(--argila-teal-dark)" }}>
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="argila-btn argila-btn-ghost"
          style={{ fontSize: "var(--text-sm)" }}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Guardar
        </button>
        {(report.status === "ready" || report.status === "published") && (
          <button
            type="button"
            onClick={onPublish}
            disabled={isPending}
            className="argila-btn argila-btn-primary"
            style={{ fontSize: "var(--text-sm)" }}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {published ? "Atualizar publicação" : "Publicar"}
          </button>
        )}
        {published && shareToken && (
          <Link
            href={`/r/${shareToken}`}
            target="_blank"
            rel="noreferrer"
            className="argila-btn argila-btn-teal"
            style={{ fontSize: "var(--text-sm)" }}
          >
            <ExternalLink className="size-4" />
            Ver página pública
          </Link>
        )}
      </div>
    </div>
  );
}
