import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canUseReports,
  getActiveSubscription,
  getLatestSubscription,
  isPastDue,
} from "@/lib/entitlement";
import { createReportDraft } from "@/actions/reports";
import { REPORT_FOCUS_OPTIONS } from "@/lib/reports/constants";
import { ArrowLeft } from "lucide-react";

const ERR_MSG: Record<string, string> = {
  period: "O período é inválido (data inicial depois da final).",
  future: "As datas do período não podem ser futuras.",
  guidance: "A orientação excede 500 caracteres.",
  focus: "No modo direcionado, escolha um foco.",
  insert: "Não foi possível criar o relatório.",
  job: "Não foi possível enfileirar a geração. Tente novamente.",
};

function monthStartStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function NovoRelatorioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { id: studentId } = await params;
  const { err } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const sub = await getActiveSubscription(supabase, user.id);
  const latest = await getLatestSubscription(supabase, user.id);
  if (!canUseReports(sub) || isPastDue(latest)) {
    redirect("/planos");
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, name")
    .eq("id", studentId)
    .eq("professor_id", user.id)
    .single();

  if (!student) notFound();

  const { data: generating } = await supabase
    .from("reports")
    .select("id")
    .eq("student_id", studentId)
    .eq("professor_id", user.id)
    .eq("status", "generating")
    .maybeSingle();

  if (generating?.id) {
    redirect(`/aluno/${studentId}/relatorios/${generating.id}`);
  }

  const errMsg = err && ERR_MSG[err] ? ERR_MSG[err] : null;

  return (
    <div className="flex flex-col gap-8 max-w-xl">
      <div>
        <Link
          href={`/aluno/${studentId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium mb-4"
          style={{ color: "var(--argila-purple)" }}
        >
          <ArrowLeft className="size-3.5" />
          Voltar para {student.name}
        </Link>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: "var(--argila-darkest)" }}
        >
          Novo relatório
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {student.name} · Período sugerido: {monthStartStr()} — {todayStr()}
        </p>
      </div>

      {errMsg && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "rgba(226,75,75,0.35)",
            background: "rgba(226,75,75,0.08)",
            color: "var(--color-error)",
          }}
        >
          {errMsg}
        </div>
      )}

      <form action={createReportDraft} className="flex flex-col gap-6">
        <input type="hidden" name="student_id" value={studentId} />

        <fieldset
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <legend className="text-xs font-bold px-1" style={{ color: "var(--argila-darkest)" }}>
            Modo
          </legend>
          <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="generation_mode"
              value="automatic"
              defaultChecked
              className="accent-[var(--argila-teal)]"
            />
            <span style={{ color: "var(--color-text-sec)" }}>
              Automático — visão abrangente
            </span>
          </label>
          <label className="flex items-center gap-2 mt-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="generation_mode"
              value="directed"
              className="accent-[var(--argila-teal)]"
            />
            <span style={{ color: "var(--color-text-sec)" }}>
              Direcionado — um foco específico
            </span>
          </label>
        </fieldset>

        <fieldset
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <legend className="text-xs font-bold px-1" style={{ color: "var(--argila-darkest)" }}>
            Foco (modo direcionado)
          </legend>
          <p className="text-xs mt-1 mb-3" style={{ color: "var(--color-text-muted)" }}>
            Escolha um aspeto se selecionou &quot;Direcionado&quot; acima.
          </p>
          <div className="flex flex-col gap-2">
            {REPORT_FOCUS_OPTIONS.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="radio"
                  name="generation_focus"
                  value={opt}
                  className="accent-[var(--argila-teal)]"
                />
                <span style={{ color: "var(--color-text-sec)" }}>{opt}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label
            className="text-xs font-bold"
            style={{ color: "var(--argila-darkest)" }}
            htmlFor="teacher_guidance"
          >
            Orientação do professor (opcional, máx. 500 caracteres)
          </label>
          <textarea
            id="teacher_guidance"
            name="teacher_guidance"
            maxLength={500}
            rows={4}
            placeholder="Ex.: enfatizar evolução da participação oral…"
            className="rounded-lg border px-3 py-2 text-sm w-full"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-bg)",
              fontFamily: "var(--font-secondary)",
            }}
          />
        </div>

        <fieldset
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <legend className="text-xs font-bold px-1" style={{ color: "var(--argila-darkest)" }}>
            Período
          </legend>
          <div className="flex flex-wrap gap-4 mt-2">
            <label className="flex flex-col gap-1 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              De
              <input
                type="date"
                name="period_start"
                required
                defaultValue={monthStartStr()}
                max={todayStr()}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-bg)",
                }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Até
              <input
                type="date"
                name="period_end"
                required
                defaultValue={todayStr()}
                max={todayStr()}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-bg)",
                }}
              />
            </label>
          </div>
        </fieldset>

        <button type="submit" className="argila-btn argila-btn-teal w-fit">
          Gerar rascunho com IA
        </button>
      </form>
    </div>
  );
}
