import { createClient } from "@/lib/supabase/server";
import { getActiveSubscription, isProfessorPremium } from "@/lib/entitlement";
import { createStudent, deleteStudentForm, setStudentClass } from "@/actions/students";
import { createClass, deleteClass } from "@/actions/classes";
import { StudentCard } from "@/components/galeria/StudentCard";
import { Users, Plus, GraduationCap, Trash2, MoveRight } from "lucide-react";

export default async function GaleriaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const sub = await getActiveSubscription(supabase, user.id);
  const premium = isProfessorPremium(sub);

  const { data: students } = await supabase
    .from("students")
    .select("id, name, class_id")
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

  // Agrupar alunos por turma
  type StudentRow = NonNullable<typeof students>[number];
  const byClass = new Map<string, StudentRow[]>((classList ?? []).map((c) => [c.id, []]));
  const noClass: StudentRow[] = [];
  for (const s of students ?? []) {
    if (s.class_id && byClass.has(s.class_id)) {
      byClass.get(s.class_id)!.push(s);
    } else {
      noClass.push(s);
    }
  }

  const studentCount = (students ?? []).length;
  const limit = premium ? 40 : 5;

  function StudentOverlay({ student, currentClassId }: { student: { id: string; name: string }; currentClassId: string | null }) {
    const otherClasses = (classList ?? []).filter((c) => c.id !== currentClassId);
    return (
      <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 flex flex-col justify-end" style={{ borderRadius: "var(--radius-xl)", padding: "var(--space-2)", gap: "var(--space-1)" }}>
        {/* Remover da turma */}
        {currentClassId && (
          <form action={setStudentClass}>
            <input type="hidden" name="student_id" value={student.id} />
            <input type="hidden" name="class_id" value="" />
            <button
              type="submit"
              className="flex items-center font-semibold w-full"
              style={{
                background: "rgba(226,75,75,0.10)",
                color: "var(--color-error)",
                border: "1px solid rgba(226,75,75,0.20)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-1) var(--space-2)",
                fontSize: "var(--text-xs)",
                gap: "var(--space-1)",
              }}
            >
              <Trash2 style={{ width: 11, height: 11 }} />
              Remover da turma
            </button>
          </form>
        )}
        {/* Mover para outra turma */}
        {otherClasses.length > 0 && (
          <form action={setStudentClass} className="flex" style={{ gap: "var(--space-1)" }}>
            <input type="hidden" name="student_id" value={student.id} />
            <select
              name="class_id"
              className="argila-input"
              style={{ fontSize: "var(--text-xs)", padding: "3px 6px", height: 28, flex: 1 }}
            >
              {!currentClassId && <option value="">Sem turma</option>}
              {otherClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="submit"
              className="flex items-center font-semibold shrink-0"
              style={{
                background: "rgba(62,57,145,0.08)",
                color: "var(--argila-indigo)",
                border: "1px solid rgba(62,57,145,0.16)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-1) var(--space-2)",
                fontSize: "var(--text-xs)",
                gap: "var(--space-1)",
                height: 28,
              }}
            >
              <MoveRight style={{ width: 11, height: 11 }} />
              Mover
            </button>
          </form>
        )}
        {/* Excluir aluno */}
        <form action={deleteStudentForm}>
          <input type="hidden" name="id" value={student.id} />
          <button
            type="submit"
            className="flex items-center font-semibold w-full"
            style={{
              background: "rgba(226,75,75,0.06)",
              color: "var(--color-error)",
              border: "1px solid rgba(226,75,75,0.12)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-1) var(--space-2)",
              fontSize: "var(--text-xs)",
              gap: "var(--space-1)",
            }}
          >
            <Trash2 style={{ width: 11, height: 11 }} />
            Excluir aluno
          </button>
        </form>
      </div>
    );
  }

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
        <section className="argila-card" style={{ padding: "var(--space-6)" }}>
          <div className="flex items-center" style={{ marginBottom: "var(--space-4)", gap: "var(--space-3)" }}>
            <GraduationCap className="shrink-0" style={{ color: "var(--argila-indigo)", width: 18, height: 18 }} />
            <h2 className="font-bold" style={{ color: "var(--argila-darkest)", fontSize: "var(--text-base)", letterSpacing: "-0.01em" }}>
              Nova turma
            </h2>
          </div>
          <form action={createClass} className="flex flex-col" style={{ gap: "var(--space-4)", maxWidth: 400 }}>
            <input
              name="name"
              required
              placeholder="Nome da turma"
              className="argila-input"
            />
            {noClass.length > 0 && (
              <fieldset style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}>
                <legend style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", padding: "0 var(--space-1)", fontWeight: 600 }}>
                  Adicionar alunos (opcional)
                </legend>
                <div className="flex flex-col" style={{ gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                  {noClass.map((s) => (
                    <label key={s.id} className="flex items-center" style={{ gap: "var(--space-2)", cursor: "pointer", fontSize: "var(--text-sm)", color: "var(--argila-darkest)" }}>
                      <input type="checkbox" name="student_ids" value={s.id} style={{ accentColor: "var(--argila-indigo)" }} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <button type="submit" className="argila-btn argila-btn-primary w-fit" style={{ height: 40, padding: "0 18px" }}>
              <Plus style={{ width: 16, height: 16 }} />
              Criar turma
            </button>
          </form>
        </section>
      )}

      {/* ── Novo aluno ── */}
      <section className="argila-card" style={{ padding: "var(--space-6)" }}>
        <div className="flex items-center" style={{ marginBottom: "var(--space-4)", gap: "var(--space-3)" }}>
          <Users className="shrink-0" style={{ color: "var(--argila-purple)", width: 18, height: 18 }} />
          <h2 className="font-bold" style={{ color: "var(--argila-darkest)", fontSize: "var(--text-base)", letterSpacing: "-0.01em" }}>
            Novo aluno
          </h2>
        </div>
        <form action={createStudent} className="flex flex-col max-w-sm" style={{ gap: "var(--space-3)" }}>
          <input name="name" required placeholder="Nome do aluno" className="argila-input" />
          {premium && (
            <select name="class_id" className="argila-input">
              <option value="">Sem turma</option>
              {(classList ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button type="submit" className="argila-btn argila-btn-teal w-fit" style={{ height: 40, padding: "0 18px" }}>
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
          <Users className="mx-auto" style={{ color: "var(--color-text-subtle)", width: 28, height: 28, marginBottom: "var(--space-3)" }} />
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
            Nenhum aluno ainda. Adicione o primeiro acima.
          </p>
        </div>
      ) : premium && (classList ?? []).length > 0 ? (
        /* ── Vista agrupada por turma (premium) ── */
        <div className="flex flex-col" style={{ gap: "var(--space-6)" }}>
          {(classList ?? []).map((c) => {
            const turmaStudents = byClass.get(c.id) ?? [];
            const availableToAdd = noClass;
            return (
              <section key={c.id} className="argila-card" style={{ padding: "var(--space-5)" }}>
                {/* Cabeçalho da turma */}
                <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-4)" }}>
                  <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
                    <GraduationCap className="shrink-0" style={{ color: "var(--argila-indigo)", width: 16, height: 16 }} />
                    <h3 className="font-bold" style={{ color: "var(--argila-darkest)", fontSize: "var(--text-sm)", letterSpacing: "-0.01em" }}>
                      {c.name}
                    </h3>
                    <span
                      className="rounded-full font-semibold"
                      style={{
                        background: "rgba(62,57,145,0.08)",
                        color: "var(--argila-indigo)",
                        fontSize: "var(--text-xs)",
                        padding: "2px 8px",
                      }}
                    >
                      {turmaStudents.length} aluno{turmaStudents.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <form action={deleteClass}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="flex items-center font-semibold transition-colors"
                      style={{
                        background: "rgba(226,75,75,0.06)",
                        color: "var(--color-error)",
                        border: "1px solid rgba(226,75,75,0.14)",
                        borderRadius: "var(--radius-sm)",
                        padding: "var(--space-1) var(--space-2)",
                        fontSize: "var(--text-xs)",
                        gap: "var(--space-1)",
                      }}
                    >
                      <Trash2 style={{ width: 12, height: 12 }} />
                      Excluir turma
                    </button>
                  </form>
                </div>

                {/* Cards dos alunos */}
                {turmaStudents.length > 0 ? (
                  <div className="grid sm:grid-cols-2" style={{ gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                    {turmaStudents.map((s) => {
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
                          <StudentOverlay student={s} currentClassId={c.id} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-4)" }}>
                    Nenhum aluno nesta turma ainda.
                  </p>
                )}

                {/* Adicionar aluno sem turma a esta turma */}
                {availableToAdd.length > 0 && (
                  <form action={setStudentClass} className="flex items-center" style={{ gap: "var(--space-2)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--color-border)" }}>
                    <input type="hidden" name="class_id" value={c.id} />
                    <select
                      name="student_id"
                      className="argila-input"
                      style={{ fontSize: "var(--text-sm)", flex: 1 }}
                    >
                      <option value="">Selecionar aluno sem turma…</option>
                      {availableToAdd.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="argila-btn argila-btn-primary shrink-0"
                      style={{ height: 40, padding: "0 14px", fontSize: "var(--text-sm)" }}
                    >
                      <Plus style={{ width: 14, height: 14 }} />
                      Adicionar
                    </button>
                  </form>
                )}
              </section>
            );
          })}

          {/* Seção "Sem turma" */}
          {noClass.length > 0 && (
            <section>
              <div className="flex items-center" style={{ gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", fontWeight: 600, whiteSpace: "nowrap" }}>
                  Sem turma
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
              </div>
              <div className="grid sm:grid-cols-2" style={{ gap: "var(--space-3)" }}>
                {noClass.map((s) => {
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
                      <StudentOverlay student={s} currentClassId={null} />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* ── Grade plana (free ou premium sem turmas) ── */
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
