import { createClient } from "@/lib/supabase/server";
import {
  getActiveSubscription,
  isProfessorPremium,
} from "@/lib/entitlement";
import { createStudent, deleteStudentForm } from "@/actions/students";
import { createClass } from "@/actions/classes";
import { StudentCard } from "@/components/galeria/StudentCard";

export default async function GaleriaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    (progress ?? []).map((p) => [
      p.student_id,
      { trend: p.attention_trend, conf: p.attention_confidence },
    ])
  );

  const studentIds = (students ?? []).map((s) => s.id);
  const { data: dsLinks } = studentIds.length
    ? await supabase
        .from("diary_students")
        .select("student_id")
        .in("student_id", studentIds)
    : { data: [] };
  const counts: Record<string, number> = {};
  for (const sid of studentIds) counts[sid] = 0;
  for (const row of dsLinks ?? []) {
    counts[row.student_id] = (counts[row.student_id] ?? 0) + 1;
  }

  return (
    <div>
      <h1
        className="text-2xl font-bold mb-2"
        style={{ color: "var(--argila-darkest)" }}
      >
        Galeria
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>
        Alunos e indicadores (atenção após 3+ diários com scoring).
      </p>

      {premium && (
        <section
          className="mb-10 rounded-2xl border p-6"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="font-semibold mb-4">Nova turma</h2>
          <form action={createClass} className="flex gap-2 flex-wrap">
            <input
              name="name"
              placeholder="Nome da turma"
              className="rounded-xl border px-4 py-2 text-sm flex-1 min-w-[200px]"
              style={{ borderColor: "var(--color-border)" }}
            />
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "var(--argila-indigo)" }}
            >
              Criar turma
            </button>
          </form>
        </section>
      )}

      <section
        className="mb-10 rounded-2xl border p-6"
        style={{ borderColor: "var(--color-border)" }}
      >
        <h2 className="font-semibold mb-4">Novo aluno</h2>
        <form action={createStudent} className="flex flex-col gap-3 max-w-md">
          <input
            name="name"
            required
            placeholder="Nome"
            className="rounded-xl border px-4 py-2 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          />
          {premium && (
            <select
              name="class_id"
              className="rounded-xl border px-4 py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            >
              <option value="">Sem turma</option>
              {(classList ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white w-fit"
            style={{ background: "var(--argila-teal)" }}
          >
            Adicionar
          </button>
        </form>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {(students ?? []).map((s) => {
          const p = progMap.get(s.id);
          const showBadge = (counts[s.id] ?? 0) >= 3;
          return (
            <div key={s.id} className="relative group">
              <StudentCard
                id={s.id}
                name={s.name}
                attentionTrend={showBadge ? p?.trend ?? null : null}
                attentionConfidence={showBadge ? p?.conf ?? null : null}
                diaryCount={counts[s.id] ?? 0}
              />
              <form
                action={deleteStudentForm}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
              >
                <input type="hidden" name="id" value={s.id} />
                <button
                  type="submit"
                  className="text-[10px] text-red-600 bg-white/90 rounded px-2 py-1"
                >
                  Excluir
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
