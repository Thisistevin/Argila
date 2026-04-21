import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canUseJourneys,
  canUseReports,
  getActiveSubscription,
  getLatestSubscription,
  isPastDue,
  isProfessorPremium,
} from "@/lib/entitlement";
import { acceptAiSuggestion, setStudentMilestone } from "@/actions/journeys";
import Link from "next/link";
import { ProfessorUpgradeBanner } from "@/components/billing/ProfessorUpgradeBanner";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Zap,
  Calendar,
  ExternalLink,
  BookOpen,
  Route,
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
  const journeysOk = canUseJourneys(sub);
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
      "absent, note, comprehension_score, attention_score, engagement_score, ai_student_summary, created_at, diaries ( content, ai_summary, lesson_type, created_at )"
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
        .select(
          "id, title, status, period_start, period_end, share_token, created_at"
        )
        .eq("student_id", id)
        .eq("professor_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const generatingReport = (reports ?? []).find((r) => r.status === "generating");

  const { data: studentJourneys } = journeysOk
    ? await supabase
        .from("student_journeys")
        .select(
          "journey_id, current_milestone_id, ai_suggested_milestone_id, ai_suggestion_note, journeys ( name )"
        )
        .eq("student_id", id)
    : { data: [] as {
        journey_id: string;
        current_milestone_id: string | null;
        ai_suggested_milestone_id: string | null;
        ai_suggestion_note: string | null;
        journeys: { name: string } | { name: string }[] | null;
      }[] };

  const journeyIds = (studentJourneys ?? []).map((j) => j.journey_id);
  const { data: allJourneyMilestones } = journeyIds.length
    ? await supabase
        .from("milestones")
        .select("id, journey_id, name, position")
        .in("journey_id", journeyIds)
        .order("position", { ascending: true })
    : { data: [] as { id: string; journey_id: string; name: string; position: number }[] };

  const milestonesByJourney = new Map<string, { id: string; journey_id: string; name: string; position: number }[]>();
  const milestoneNameById = new Map<string, string>();
  for (const m of allJourneyMilestones ?? []) {
    const list = milestonesByJourney.get(m.journey_id) ?? [];
    list.push(m);
    milestonesByJourney.set(m.journey_id, list);
    milestoneNameById.set(m.id, m.name);
  }

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

      {/* ── Upsell: métricas / jornadas / relatórios (lugares das secções Professor) ── */}
      {!premium && (
        <ProfessorUpgradeBanner
          icon={TrendingUp}
          title="Obtenha métricas desse aluno no plano Professor"
          description="Veja progresso geral, atenção, compreensão e engajamento calculados a partir dos diários."
          cta="Fazer upgrade"
        />
      )}
      {!journeysOk && (
        <ProfessorUpgradeBanner
          icon={Route}
          title="Acompanhe jornadas de aprendizado no plano Professor"
          description="Posicione o aluno em marcos de evolução e receba sugestões de etapa com base nos diários."
          cta="Fazer upgrade"
        />
      )}
      {!reportsOk && (
        <ProfessorUpgradeBanner
          icon={FileText}
          title="Gere relatórios com IA no plano Professor"
          description="Transforme o histórico do aluno em relatórios revisáveis para compartilhar com responsáveis."
          cta="Fazer upgrade"
        />
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

      {/* ── Jornadas ── */}
      {journeysOk && (studentJourneys ?? []).length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-bold" style={{ color: "var(--argila-darkest)" }}>
            Jornadas
          </h2>
          <div className="flex flex-col gap-4">
            {(studentJourneys ?? []).map((sj) => {
              const rawJ = sj.journeys;
              const jn = (Array.isArray(rawJ) ? rawJ[0] : rawJ)?.name ?? "Jornada";
              const ms = milestonesByJourney.get(sj.journey_id) ?? [];
              const sorted = [...ms].sort((a, b) => a.position - b.position);
              const curIdx = sj.current_milestone_id
                ? sorted.findIndex((m) => m.id === sj.current_milestone_id)
                : -1;
              const suggestedName = sj.ai_suggested_milestone_id
                ? milestoneNameById.get(sj.ai_suggested_milestone_id)
                : null;

              return (
                <div key={sj.journey_id} className="argila-card p-5 flex flex-col gap-4">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--argila-darkest)" }}>
                    {jn}
                  </h3>

                  <div className="overflow-x-auto pb-1">
                    <div className="flex items-center gap-0 min-w-max">
                      {sorted.map((m, idx) => {
                        const past = curIdx >= 0 && idx < curIdx;
                        const current = idx === curIdx;
                        const fill = current
                          ? "var(--argila-teal)"
                          : past
                            ? "rgba(79,207,216,0.35)"
                            : "var(--color-border)";
                        const border = current ? "var(--argila-teal)" : "var(--color-border)";
                        return (
                          <div key={m.id} className="flex items-center">
                            <div className="flex flex-col items-center" style={{ width: 72 }}>
                              <div
                                className="flex items-center justify-center rounded-full font-bold shrink-0"
                                style={{
                                  width: 28,
                                  height: 28,
                                  fontSize: 11,
                                  background: fill,
                                  color: current ? "#fff" : "var(--color-text-muted)",
                                  border: `2px solid ${border}`,
                                }}
                              >
                                {idx + 1}
                              </div>
                              <span
                                className="text-center mt-1.5 text-[10px] leading-tight px-0.5"
                                style={{
                                  fontWeight: current ? 700 : 500,
                                  color: current ? "var(--argila-darkest)" : "var(--color-text-muted)",
                                }}
                              >
                                {m.name}
                              </span>
                            </div>
                            {idx < sorted.length - 1 && (
                              <div
                                className="shrink-0"
                                style={{
                                  width: 20,
                                  height: 2,
                                  background:
                                    curIdx >= 0 && idx < curIdx
                                      ? "rgba(79,207,216,0.45)"
                                      : "var(--color-border)",
                                  marginBottom: 28,
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {(sj.ai_suggested_milestone_id || sj.ai_suggestion_note) && (
                    <div
                      className="rounded-lg border p-3 flex flex-col gap-2"
                      style={{
                        borderColor: "rgba(125,99,175,0.22)",
                        background: "rgba(125,99,175,0.06)",
                      }}
                    >
                      {suggestedName && (
                        <p className="text-xs font-semibold" style={{ color: "var(--argila-purple)" }}>
                          Sugestão IA: {suggestedName}
                        </p>
                      )}
                      {sj.ai_suggestion_note && (
                        <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                          {sj.ai_suggestion_note}
                        </p>
                      )}
                      {sj.ai_suggested_milestone_id && (
                        <form action={acceptAiSuggestion}>
                          <input type="hidden" name="student_id" value={id} />
                          <input type="hidden" name="journey_id" value={sj.journey_id} />
                          <button type="submit" className="argila-btn argila-btn-primary text-xs h-8 px-3">
                            Aceitar sugestão
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  <form action={setStudentMilestone} className="flex flex-wrap items-center gap-2 pt-1">
                    <input type="hidden" name="student_id" value={id} />
                    <input type="hidden" name="journey_id" value={sj.journey_id} />
                    <span className="text-[10px] font-semibold w-full sm:w-auto" style={{ color: "var(--color-text-muted)" }}>
                      Etapa manual
                    </span>
                    <select
                      name="milestone_id"
                      className="argila-input argila-input-compact min-w-[220px] text-xs"
                      defaultValue={sj.current_milestone_id ?? ""}
                    >
                      <option value="">Não iniciado</option>
                      {sorted.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="argila-btn argila-btn-ghost text-xs h-8 px-3">
                      Definir manualmente
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Relatórios ── */}
      {reportsOk && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: "var(--argila-darkest)" }}>
              Relatórios IA
            </h2>
            {generatingReport ? (
              <Link
                href={`/aluno/${id}/relatorios/${generatingReport.id}`}
                className="argila-btn argila-btn-ghost pointer-events-auto"
                style={{ fontSize: "var(--text-xs)" }}
              >
                Relatório em andamento…
              </Link>
            ) : (
              <Link
                href={`/aluno/${id}/relatorios/novo`}
                className="argila-btn argila-btn-primary"
              >
                <Zap className="size-4" />
                Gerar relatório
              </Link>
            )}
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
              {(reports ?? []).map((r) => {
                const status = r.status ?? "published";
                const badge =
                  status === "generating"
                    ? {
                        label: "Gerando…",
                        bg: "rgba(234,179,8,0.12)",
                        color: "var(--color-warning)",
                        border: "1px solid rgba(234,179,8,0.28)",
                      }
                    : status === "ready"
                      ? {
                          label: "Rascunho",
                          bg: "rgba(79,207,216,0.14)",
                          color: "var(--argila-teal)",
                          border: "1px solid rgba(79,207,216,0.22)",
                        }
                      : status === "failed"
                        ? {
                            label: "Falhou",
                            bg: "rgba(226,75,75,0.10)",
                            color: "var(--color-error)",
                            border: "1px solid rgba(226,75,75,0.22)",
                          }
                        : {
                            label: "Publicado",
                            bg: "rgba(34,197,94,0.12)",
                            color: "var(--color-success)",
                            border: "1px solid rgba(34,197,94,0.25)",
                          };
                return (
                  <li
                    key={r.id}
                    className="argila-card flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--argila-darkest)" }}
                        >
                          {r.title ?? "Relatório"}
                        </p>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            border: badge.border,
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {r.period_start} → {r.period_end}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/aluno/${id}/relatorios/${r.id}`}
                        className="argila-btn argila-btn-ghost"
                        style={{ fontSize: "var(--text-xs)", height: 32, padding: "0 12px" }}
                      >
                        Abrir
                      </Link>
                      {r.share_token && status === "published" && (
                        <a
                          href={`/r/${r.share_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="argila-btn argila-btn-ghost"
                          style={{ fontSize: "var(--text-xs)", height: 32, padding: "0 12px" }}
                        >
                          <ExternalLink className="size-3.5" />
                          Ver
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
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
                    {(e as { ai_student_summary?: string | null }).ai_student_summary ??
                      d?.ai_summary ??
                      d?.content ??
                      ""}
                  </p>

                  {premium && e.absent && (
                    <div className="pt-2">
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                        style={{ background: "rgba(226,75,75,0.10)", color: "var(--color-error)" }}
                      >
                        Falta
                      </span>
                    </div>
                  )}

                  {premium && !e.absent && (
                    <div
                      className="flex flex-wrap items-center gap-3 pt-3"
                      style={{ borderTop: "1px solid var(--color-border)" }}
                    >
                      <ScorePill label="Comp." value={e.comprehension_score} />
                      <ScorePill label="Aten." value={e.attention_score} />
                      <ScorePill label="Engaj." value={e.engagement_score} />
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
