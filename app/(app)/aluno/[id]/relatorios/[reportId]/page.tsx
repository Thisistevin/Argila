import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canUseReports,
  getActiveSubscription,
  getLatestSubscription,
  isPastDue,
} from "@/lib/entitlement";
import { regenerateReport } from "@/actions/reports";
import { GeneratingPoll } from "@/components/reports/GeneratingPoll";
import { ReportEditor } from "@/components/reports/ReportEditor";
import { ArrowLeft, Loader2 } from "lucide-react";

function startOfLocalDayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function RelatorioEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; reportId: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { id: studentId, reportId } = await params;
  const { err } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const sub = await getActiveSubscription(supabase, user.id);
  const latest = await getLatestSubscription(supabase, user.id);
  if (!canUseReports(sub) || isPastDue(latest)) {
    notFound();
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, name")
    .eq("id", studentId)
    .eq("professor_id", user.id)
    .single();

  if (!student) notFound();

  const { data: report } = await supabase
    .from("reports")
    .select(
      "id, student_id, title, content, status, share_token, highlights, suggestions, period_start, period_end, created_at"
    )
    .eq("id", reportId)
    .eq("professor_id", user.id)
    .eq("student_id", studentId)
    .maybeSingle();

  if (!report) notFound();

  const { count: todayCount } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("professor_id", user.id)
    .gte("created_at", startOfLocalDayIso());

  const dailyLimitReached = (todayCount ?? 0) >= 3;

  const errBanner =
    err === "limite_diario"
      ? "Limite de 3 relatórios por dia para este aluno. Tente amanhã."
      : err === "regen"
        ? "Não foi possível repetir a geração neste estado."
        : err === "insert" || err === "job"
          ? "Falha ao criar novo relatório. Tente novamente."
          : null;

  if (report.status === "generating") {
    return (
      <div className="flex flex-col gap-6 max-w-xl">
        <GeneratingPoll />
        <Link
          href={`/aluno/${studentId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium"
          style={{ color: "var(--argila-purple)" }}
        >
          <ArrowLeft className="size-3.5" />
          Voltar para {student.name}
        </Link>
        <div
          className="argila-card flex flex-col items-center justify-center gap-4 py-16 px-6 text-center"
        >
          <Loader2
            className="size-10 animate-spin"
            style={{ color: "var(--argila-teal)" }}
          />
          <p className="text-sm font-medium" style={{ color: "var(--argila-darkest)" }}>
            Gerando relatório com IA…
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Esta página atualiza automaticamente a cada poucos segundos.
          </p>
        </div>
      </div>
    );
  }

  if (report.status === "failed") {
    return (
      <div className="flex flex-col gap-6 max-w-xl">
        <Link
          href={`/aluno/${studentId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium"
          style={{ color: "var(--argila-purple)" }}
        >
          <ArrowLeft className="size-3.5" />
          Voltar para {student.name}
        </Link>
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--argila-darkest)" }}
        >
          Geração falhou
        </h1>
        {errBanner && (
          <p className="text-sm" style={{ color: "var(--color-error)" }}>
            {errBanner}
          </p>
        )}
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Ocorreu um erro ao gerar o relatório. Pode tentar de novo; será criado
          um novo rascunho.
        </p>
        <form action={regenerateReport.bind(null, reportId)}>
          <button
            type="submit"
            disabled={dailyLimitReached}
            className="argila-btn argila-btn-primary disabled:opacity-40"
            title={
              dailyLimitReached
                ? "Limite de 3 relatórios por dia atingido"
                : undefined
            }
          >
            Tentar novamente
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/aluno/${studentId}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium mb-3"
            style={{ color: "var(--argila-purple)" }}
          >
            <ArrowLeft className="size-3.5" />
            Voltar para {student.name}
          </Link>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--argila-darkest)" }}
          >
            Relatório
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Período: {report.period_start} — {report.period_end}
          </p>
        </div>
        {report.status === "published" && (
          <span
            className="rounded-full px-3 py-1 text-[11px] font-semibold shrink-0"
            style={{
              background: "rgba(34,197,94,0.12)",
              color: "var(--color-success)",
              border: "1px solid rgba(34,197,94,0.25)",
            }}
          >
            Publicado
          </span>
        )}
        {report.status === "ready" && (
          <span
            className="rounded-full px-3 py-1 text-[11px] font-semibold shrink-0"
            style={{
              background: "rgba(79,207,216,0.14)",
              color: "var(--argila-teal)",
              border: "1px solid rgba(79,207,216,0.22)",
            }}
          >
            Rascunho
          </span>
        )}
      </div>

      <ReportEditor
        report={{
          id: report.id,
          student_id: report.student_id,
          title: report.title,
          content: report.content,
          status: report.status,
          share_token: report.share_token,
          highlights: report.highlights,
          suggestions: report.suggestions,
        }}
      />
    </div>
  );
}
