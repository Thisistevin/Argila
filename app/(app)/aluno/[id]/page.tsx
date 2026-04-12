import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canUseReports,
  getActiveSubscription,
  getLatestSubscription,
  isPastDue,
  isProfessorPremium,
} from "@/lib/entitlement";
import { enqueueReportFromForm } from "@/actions/reports";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Zap,
  Calendar,
  ExternalLink,
  BookOpen,
} from "lucide-react";

function ScorePill({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  const color =
    value >= 7 ? "var(--color-success)" : value >= 5 ? "var(--color-warning)" : "var(--color-error)";
  return (
    <div
      className="flex flex-col items-center rounded-xl px-3 py-2 min-w-[56px]"
      style={{ background: "var(--color-bg-2)" }}
    >
      <span className="text-base font-bold" style={{ color }}>
        {value.toFixed(1)}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: "var(--color-text-subtle)" }}>
        {label}
      </span>
    </div>
  );
}

export default async function AlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const sub = await getActiveSubscription(supabase, user.id);
  const latest = await getLatestSubscription(supabase, user.id);
  const premium = isProfessorPremium(sub);
  const reportsOk = canUseReports(sub) && !isPastDue(latest);

  const { data: student } = await supabase
    .from("students")
    .select("id, name, created_at")
    .eq("id", id)
    .eq("professor_id", user.id)
    .single();

  if (!student) notFound();

  const { data: entries } = await supabase
    .from("diary_students")
    .select(
      "absent, note, comprehension_score, attention_score, engagement_score, created_at, diaries ( content, ai_summary, lesson_type, created_at )"
    )
    .eq("student_id", id)
    .order("created_at", { ascending: false });

  const { data: progress } = await supabase
    .from("student_progress")
    .select("*")
    .eq("student_id", id)
    .eq("professor_id", user.id)
    .maybeSingle();

  const { data: reports } = reportsOk
    ? await supabase
        .from("reports")
        .select("id, title, period_start, period_end, share_token, created_at")
        .eq("student_id", id)
        .eq("professor_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const trendIcon =
    progress?.attention_trend === "improving" ? (
      <TrendingUp className="size-4" style={{ color: "var(--color-success)" }} />
    ) : progress?.attention_trend === "declining" ? (
      <TrendingDown className="size-4" style={{ color: "var(--color-error)" }} />
    ) : (
      <Minus className="size-4" style={{ color: "var(--argila-teal-dark)" }} />
    );

  return (
    <div className="flex flex-col gap-8">

      {/* ── Header ── */}
      <div>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: "var(--argila-darkest)" }}
        >
          {student.name}
        </h1>
        <div className="flex items-center gap-1.5">
          <Calendar className="size-3.5" style={{ color: "var(--color-text-subtle)" }} />
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Desde {new Date(student.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>

      {/* ── Banner plano Explorar ── */}
      {!premium && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{
            background: "rgba(62,57,145,0.05)",
            borderColor: "rgba(62,57,145,0.14)",
            color: "var(--argila-navy)",
            fontFamily: "var(--font-secondary)",
          }}
        >
          Plano Explorar: histórico simples, sem scores agregados nem relatórios IA.
        </div>
      )}

      {/* ── Progresso ── */}
      {premium && progress && (
        <section className="argila-card p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: "var(--argila-darkest)" }}>
              Progresso geral
            </h2>
            <div className="flex items-center gap-1.5">
              {trendIcon}
              <span className="text-xs font-semibold capitalize" style={{ color: "var(--color-text-muted)" }}>
                {progress.attention_trend ?? "—"}
              </span>
            </div>
          </div>

          {/* Scores */}
          <div className="flex gap-3">
            <ScorePill label="Geral" value={progress.overall_score} />
            <ScorePill label="Atenção" value={progress.attention_score ?? null} />
            <ScorePill label="Comp." value={progress.comprehension_score ?? null} />
            <ScorePill label="Engaj." value={progress.engagement_score ?? null} />
          </div>

          {progress.short_note && (
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-secondary)" }}
            >
              {progress.short_note}
            </p>
          )}

          {progress.last_diary_at && (
            <div className="flex items-center gap-1.5 pt-1" style={{ borderTop: "1px solid var(--color-border)" }}>
              <BookOpen className="size-3.5 shrink-0" style={{ color: "var(--color-text-subtle)" }} />
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Último diário: {new Date(progress.last_diary_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}
        </section>
      )}

      {/* ── Relatórios ── */}
      {reportsOk && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: "var(--argila-darkest)" }}>
              Relatórios IA
            </h2>
            <form action={enqueueReportFromForm}>
              <input type="hidden" name="student_id" value={id} />
              <button type="submit" className="argila-btn argila-btn-primary">
                <Zap className="size-4" />
                Gerar relatório
              </button>
            </form>
          </div>

          {(reports ?? []).length === 0 ? (
            <div
              className="rounded-xl border-2 border-dashed py-8 text-center"
              style={{ borderColor: "var(--color-border)" }}
            >
              <FileText className="mx-auto mb-2 size-6" style={{ color: "var(--color-text-subtle)" }} />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Nenhum relatório gerado ainda.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {(reports ?? []).map((r) => (
                <li
                  key={r.id}
                  className="argila-card flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--argila-darkest)" }}>
                      {r.title ?? "Relatório"}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {r.period_start} → {r.period_end}
                    </p>
                  </div>
                  {r.share_token && (
                    <a
                      href={`/r/${r.share_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="argila-btn argila-btn-ghost shrink-0"
                      style={{ fontSize: "var(--text-xs)", height: 32, padding: "0 12px" }}
                    >
                      <ExternalLink className="size-3.5" />
                      Ver
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Histórico de diários ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold" style={{ color: "var(--argila-darkest)" }}>
          Histórico de diários
        </h2>

        {(entries ?? []).length === 0 ? (
          <div
            className="rounded-xl border-2 border-dashed py-8 text-center"
            style={{ borderColor: "var(--color-border)" }}
          >
            <BookOpen className="mx-auto mb-2 size-6" style={{ color: "var(--color-text-subtle)" }} />
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Nenhum diário registrado ainda.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {(entries ?? []).map((e) => {
              const raw = e.diaries;
              const d = (Array.isArray(raw) ? raw[0] : raw) as {
                content: string;
                ai_summary: string | null;
                lesson_type: string | null;
                created_at: string;
              } | null;
              return (
                <li
                  key={`${e.created_at}`}
                  className="argila-card flex flex-col gap-3 p-5"
                >
                  {/* Data + tipo */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 shrink-0" style={{ color: "var(--color-text-subtle)" }} />
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {d?.created_at ? new Date(d.created_at).toLocaleString("pt-BR") : ""}
                      </span>
                    </div>
                    {d?.lesson_type && (
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize"
                        style={{
                          background: "rgba(125,99,175,0.10)",
                          color: "var(--argila-purple)",
                        }}
                      >
                        {d.lesson_type === "theoretical" ? "Teórica" : d.lesson_type === "practical" ? "Prática" : "Mista"}
                      </span>
                    )}
                  </div>

                  {/* Resumo */}
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--color-text-sec)", fontFamily: "var(--font-secondary)" }}
                  >
                    {d?.ai_summary ?? d?.content ?? ""}
                  </p>

                  {/* Scores + falta */}
                  {premium && (
                    <div
                      className="flex flex-wrap items-center gap-3 pt-3"
                      style={{ borderTop: "1px solid var(--color-border)" }}
                    >
                      <ScorePill label="Comp." value={e.comprehension_score} />
                      <ScorePill label="Aten." value={e.attention_score} />
                      <ScorePill label="Engaj." value={e.engagement_score} />
                      {e.absent && (
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                          style={{ background: "rgba(226,75,75,0.10)", color: "var(--color-error)" }}
                        >
                          Falta
                        </span>
                      )}
                      {e.note && (
                        <p className="w-full text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                          Obs.: {e.note}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
