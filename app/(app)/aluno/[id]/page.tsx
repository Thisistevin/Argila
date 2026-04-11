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
  const reportsOk =
    canUseReports(sub) && !isPastDue(latest);

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

  return (
    <div>
      <h1
        className="text-2xl font-bold mb-2"
        style={{ color: "var(--argila-darkest)" }}
      >
        {student.name}
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
        Desde {new Date(student.created_at).toLocaleDateString("pt-BR")}
      </p>

      {!premium && (
        <p className="text-sm mb-6 p-4 rounded-xl border" style={{ borderColor: "var(--color-border)" }}>
          Plano Explorar: histórico simples, sem scores agregados nem relatórios IA.
        </p>
      )}

      {premium && progress && (
        <section
          className="mb-8 rounded-2xl border p-6"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="font-semibold mb-2">Progresso</h2>
          <p className="text-sm">
            Score geral: {progress.overall_score ?? "—"} · Atenção:{" "}
            {progress.attention_trend ?? "—"} · Último diário:{" "}
            {progress.last_diary_at
              ? new Date(progress.last_diary_at).toLocaleDateString("pt-BR")
              : "—"}
          </p>
          {progress.short_note && (
            <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
              Nota: {progress.short_note}
            </p>
          )}
        </section>
      )}

      {reportsOk && (
        <section className="mb-8">
          <form action={enqueueReportFromForm} className="inline-block">
            <input type="hidden" name="student_id" value={id} />
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--argila-purple)" }}
            >
              Gerar relatório (fila IA)
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {(reports ?? []).map((r) => (
              <li key={r.id} className="text-sm">
                {r.title ?? "Relatório"} —{" "}
                {r.period_start} a {r.period_end}
                {r.share_token && (
                  <a
                    className="ml-2 underline"
                    style={{ color: "var(--argila-indigo)" }}
                    href={`/r/${r.share_token}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Link público
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="font-semibold mb-4">Histórico de diários</h2>
      <ul className="space-y-4">
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
              className="rounded-xl border p-4 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p className="text-xs mb-2" style={{ color: "var(--color-text-muted)" }}>
                {d?.created_at
                  ? new Date(d.created_at).toLocaleString("pt-BR")
                  : ""}
              </p>
              <p>{d?.ai_summary ?? d?.content ?? ""}</p>
              {premium && (
                <p className="mt-2 text-xs">
                  Comp.: {e.comprehension_score ?? "—"} · Aten.:{" "}
                  {e.attention_score ?? "—"} · Engaj.: {e.engagement_score ?? "—"}{" "}
                  · Falta: {e.absent ? "sim" : "não"}
                </p>
              )}
              {e.note && <p className="mt-1 text-xs">Obs.: {e.note}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
