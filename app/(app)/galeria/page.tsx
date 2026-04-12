import { createClient } from "@/lib/supabase/server";
import { getActiveSubscription, isProfessorPremium } from "@/lib/entitlement";
import { createStudent, deleteStudentForm } from "@/actions/students";
import { createClass } from "@/actions/classes";
import { StudentCard } from "@/components/galeria/StudentCard";
import { Users, Plus, GraduationCap, Trash2 } from "lucide-react";

export default async function GaleriaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const sub = await getActiveSubscription(supabase, user.id);
  const premium = isProfessorPremium(sub);

  const { data: students } = await supabase
    .from("students")
    .select("id, name")
    .eq("professor_id", user.id)
    .order("name");

  const { data: classList } = await supabase
    .from("classes")
    .select("id, name")
    .eq("professor_id", user.id)
    .order("name");

  const { data: progress } = await supabase
    .from("student_progress")
    .select("student_id, attention_trend, attention_confidence")
    .eq("professor_id", user.id);

  const progMap = new Map(
    (progress ?? []).map((p) => [p.student_id, { trend: p.attention_trend, conf: p.attention_confidence }])
  );

  const studentIds = (students ?? []).map((s) => s.id);
  const { data: dsLinks } = studentIds.length
    ? await supabase.from("diary_students").select("student_id").in("student_id", studentIds)
    : { data: [] };

  const counts: Record<string, number> = {};
  for (const sid of studentIds) counts[sid] = 0;
  for (const row of dsLinks ?? []) {
    counts[row.student_id] = (counts[row.student_id] ?? 0) + 1;
  }

  const studentCount = (students ?? []).length;
  const limit = premium ? 40 : 5;

  return (
    <div className="flex flex-col" style={{ gap: "var(--space-8)" }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between" style={{ gap: "var(--space-4)" }}>
        <div>
          <h1
            className="font-bold"
            style={{
              color: "var(--argila-darkest)",
              fontSize: "var(--text-2xl)",
              letterSpacing: "-0.02em",
              marginBottom: "var(--space-1)",
            }}
          >
            Galeria
          </h1>
          <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
              {studentCount} de {limit} aluno{limit > 1 ? "s" : ""}
            </p>
            {!premium && (
              <span
                className="rounded-full font-semibold"
                style={{
                  background: "rgba(62,57,145,0.08)",
                  color: "var(--argila-indigo)",
                  fontSize: "var(--text-xs)",
                  padding: "3px 9px",
                }}
              >
                Explorar
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Nova turma (Professor) ── */}
      {premium && (
        <section
          className="argila-card"
          style={{ padding: "var(--space-6)" }}
        >
          <div
            className="flex items-center"
            style={{ marginBottom: "var(--space-4)", gap: "var(--space-3)" }}
          >
            <GraduationCap
              className="shrink-0"
              style={{ color: "var(--argila-indigo)", width: 18, height: 18 }}
            />
            <h2
              className="font-bold"
              style={{ color: "var(--argila-darkest)", fontSize: "var(--text-base)", letterSpacing: "-0.01em" }}
            >
              Nova turma
            </h2>
          </div>
          <form action={createClass} className="flex" style={{ gap: "var(--space-3)" }}>
            <input
              name="name"
              placeholder="Nome da turma"
              className="argila-input"
              style={{ maxWidth: 280 }}
            />
            <button type="submit" className="argila-btn argila-btn-primary shrink-0" style={{ height: 40, padding: "0 18px" }}>
              <Plus style={{ width: 16, height: 16 }} />
              Criar
            </button>
          </form>
        </section>
      )}

      {/* ── Novo aluno ── */}
      <section
        className="argila-card"
        style={{ padding: "var(--space-6)" }}
      >
        <div
          className="flex items-center"
          style={{ marginBottom: "var(--space-4)", gap: "var(--space-3)" }}
        >
          <Users
            className="shrink-0"
            style={{ color: "var(--argila-purple)", width: 18, height: 18 }}
          />
          <h2
            className="font-bold"
            style={{ color: "var(--argila-darkest)", fontSize: "var(--text-base)", letterSpacing: "-0.01em" }}
          >
            Novo aluno
          </h2>
        </div>
        <form action={createStudent} className="flex flex-col max-w-sm" style={{ gap: "var(--space-3)" }}>
          <input
            name="name"
            required
            placeholder="Nome do aluno"
            className="argila-input"
          />
          {premium && (
            <select name="class_id" className="argila-input">
              <option value="">Sem turma</option>
              {(classList ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="argila-btn argila-btn-teal w-fit"
            style={{ height: 40, padding: "0 18px" }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            Adicionar aluno
          </button>
        </form>
      </section>

      {/* ── Grade de alunos ── */}
      {studentCount === 0 ? (
        <div
          className="text-center"
          style={{
            borderRadius: "var(--radius-xl)",
            border: "2px dashed var(--color-border)",
            padding: "var(--space-16) var(--space-6)",
          }}
        >
          <Users
            className="mx-auto"
            style={{
              color: "var(--color-text-subtle)",
              width: 28,
              height: 28,
              marginBottom: "var(--space-3)",
            }}
          />
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
            Nenhum aluno ainda. Adicione o primeiro acima.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2" style={{ gap: "var(--space-4)" }}>
          {(students ?? []).map((s) => {
            const p = progMap.get(s.id);
            const showBadge = (counts[s.id] ?? 0) >= 3;
            return (
              <div key={s.id} className="group relative">
                <StudentCard
                  id={s.id}
                  name={s.name}
                  attentionTrend={showBadge ? (p?.trend ?? null) : null}
                  attentionConfidence={showBadge ? (p?.conf ?? null) : null}
                  diaryCount={counts[s.id] ?? 0}
                />
                <form
                  action={deleteStudentForm}
                  className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <input type="hidden" name="id" value={s.id} />
                  <button
                    type="submit"
                    className="flex items-center font-semibold transition-colors"
                    style={{
                      background: "rgba(226,75,75,0.08)",
                      color: "var(--color-error)",
                      border: "1px solid rgba(226,75,75,0.16)",
                      borderRadius: "var(--radius-sm)",
                      padding: "var(--space-1) var(--space-2)",
                      fontSize: "var(--text-xs)",
                      gap: "var(--space-1)",
                    }}
                  >
                    <Trash2 style={{ width: 12, height: 12 }} />
                    Excluir
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
