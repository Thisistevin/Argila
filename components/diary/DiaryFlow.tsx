"use client";

import { useMemo, useState } from "react";
import {
  completeDiary,
  finalizeDiaryStudentSummariesAction,
} from "@/actions/diary";
import { FileUpload } from "@/components/diary/FileUpload";
import { Send, ChevronRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

type StudentRow = { id: string; name: string; class_id: string | null };

const STEP_LABELS = [
  "Conteúdo",
  "Público-alvo",
  "Aprendizado",
  "Concentração",
  "Engajamento",
  "Observações",
  "Confirmar",
];

function StarPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold" style={{ color: "var(--color-text-muted)" }}>
        {label} (0–5)
      </span>
      <div className="flex flex-wrap gap-1">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="flex size-9 items-center justify-center rounded-lg border text-xs font-bold transition-all"
            style={{
              borderColor: value === n ? "var(--argila-teal)" : "var(--color-border)",
              background: value === n ? "rgba(79,207,216,0.14)" : "var(--color-surface)",
              color: value === n ? "var(--argila-teal-dark)" : "var(--color-text-muted)",
            }}
            aria-label={`${label} ${n}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DiaryFlow({
  userId,
  students,
  premium,
  classes,
}: {
  userId: string;
  students: StudentRow[];
  premium: boolean;
  classes: { id: string; name: string }[];
}) {
  const [step, setStep] = useState(1);
  const [content, setContent] = useState("");
  const [attachmentPath, setAttachmentPath] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<string | null>(null);
  const [aiHistory, setAiHistory] = useState("");
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState("");
  const [summary, setSummary] = useState("");
  const [lessonType, setLessonType] = useState<"theoretical" | "practical" | "mixed">("mixed");
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(() => new Set());
  const [extraStudentIds, setExtraStudentIds] = useState<Set<string>>(() => new Set());
  const [absent, setAbsent] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<
    Record<string, { comp: number; att: number; eng: number }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const classMemberIds = useMemo(() => {
    const s = new Set<string>();
    if (!premium) return s;
    for (const cid of selectedClassIds) {
      for (const st of students) {
        if (st.class_id === cid) s.add(st.id);
      }
    }
    return s;
  }, [students, selectedClassIds, premium]);

  const targetStudentIds = useMemo(() => {
    const s = new Set<string>([...classMemberIds, ...extraStudentIds]);
    return [...s].sort((a, b) => {
      const na = students.find((x) => x.id === a)?.name ?? "";
      const nb = students.find((x) => x.id === b)?.name ?? "";
      return na.localeCompare(nb, "pt");
    });
  }, [classMemberIds, extraStudentIds, students]);

  const targetList = useMemo(
    () =>
      targetStudentIds
        .map((id) => students.find((s) => s.id === id))
        .filter((s): s is StudentRow => Boolean(s)),
    [targetStudentIds, students]
  );

  const presentIds = useMemo(
    () => targetStudentIds.filter((id) => !(absent[id] ?? false)),
    [targetStudentIds, absent]
  );

  const avulsoCandidates = useMemo(
    () => students.filter((s) => !classMemberIds.has(s.id)),
    [students, classMemberIds]
  );

  async function runAiTurn(userLine: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/diary-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: userLine, history: aiHistory }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as { error?: string }).error ?? "Falha na IA");
      }
      const j = (await res.json()) as {
        step?: number;
        question?: string | null;
        is_last?: boolean;
        lesson_type?: string | null;
        summary?: string | null;
      };
      const hist = `${aiHistory}\nProfessor: ${userLine}\nAssistente: ${JSON.stringify(j)}`;
      setAiHistory(hist);
      if (j.lesson_type === "theoretical" || j.lesson_type === "practical" || j.lesson_type === "mixed") {
        setLessonType(j.lesson_type);
      }
      if (j.is_last && j.summary) {
        setSummary(j.summary);
        setAiQuestion(null);
        setStep(2);
      } else {
        setAiQuestion(j.question ?? "Continue.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  function ensureRatingsForPresent() {
    setRatings((prev) => {
      const next = { ...prev };
      for (const id of presentIds) {
        if (!next[id]) next[id] = { comp: 3, att: 3, eng: 3 };
      }
      return next;
    });
  }

  async function submitDiary() {
    setLoading(true);
    setError(null);
    try {
      const presentStudents = presentIds
        .map((id) => students.find((s) => s.id === id)!)
        .filter(Boolean);

      let summaryMap: Record<string, string> = {};
      if (presentStudents.length > 0) {
        const fin = await finalizeDiaryStudentSummariesAction({
          content,
          lessonType,
          draftSummary: summary || content.slice(0, 500),
          students: presentStudents.map((s) => ({ id: s.id, name: s.name })),
          notesByStudent: Object.fromEntries(
            presentStudents.map((s) => [s.id, notes[s.id] ?? ""])
          ),
        });
        if (!fin.ok) {
          setError(fin.error);
          setLoading(false);
          return;
        }
        summaryMap = fin.summaries;
      }

      const rows = targetStudentIds.map((id) => {
        const isAbs = absent[id] ?? false;
        const r = ratings[id] ?? { comp: 3, att: 3, eng: 3 };
        return {
          studentId: id,
          absent: isAbs,
          note: notes[id] || undefined,
          teacherComprehensionRating: isAbs ? null : r.comp,
          teacherAttentionRating: isAbs ? null : r.att,
          teacherEngagementRating: isAbs ? null : r.eng,
        };
      });

      const studentSummaries = presentStudents.map((s) => ({
        studentId: s.id,
        summary: summaryMap[s.id] ?? `${s.name} participou da aula.`,
      }));

      const result = await completeDiary({
        content,
        lessonType,
        aiSummary: summary || content.slice(0, 500),
        attachment_storage_path: attachmentPath,
        attachment_content_type: attachmentType,
        studentIds: targetStudentIds,
        classIds: premium ? [...selectedClassIds] : undefined,
        rows,
        studentSummaries: studentSummaries.length ? studentSummaries : undefined,
      });
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = "/diario";
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    }
  }

  function toggleClass(cid: string, checked: boolean) {
    setSelectedClassIds((prev) => {
      const n = new Set(prev);
      if (checked) n.add(cid);
      else n.delete(cid);
      return n;
    });
    if (checked) {
      setExtraStudentIds((prev) => {
        const n = new Set(prev);
        for (const st of students) {
          if (st.class_id === cid) n.delete(st.id);
        }
        return n;
      });
    }
  }

  function toggleExtra(sid: string, checked: boolean) {
    setExtraStudentIds((prev) => {
      const n = new Set(prev);
      if (checked) n.add(sid);
      else n.delete(sid);
      return n;
    });
  }

  function goFromStep2() {
    if (targetStudentIds.length === 0) {
      setError("Selecione turmas ou alunos.");
      return;
    }
    setError(null);
    if (presentIds.length === 0) {
      setStep(7);
    } else {
      ensureRatingsForPresent();
      setStep(3);
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-xl">

      <div className="flex flex-wrap items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="flex size-6 items-center justify-center rounded-full text-[11px] font-bold shrink-0 transition-all"
                  style={
                    done
                      ? { background: "var(--argila-teal)", color: "var(--argila-darkest)" }
                      : active
                        ? { background: "var(--argila-indigo)", color: "#fff" }
                        : { background: "var(--color-bg-2)", color: "var(--color-text-subtle)" }
                  }
                >
                  {done ? <CheckCircle2 className="size-3.5" /> : n}
                </div>
                <span
                  className="text-xs font-medium hidden sm:block max-w-[100px] truncate"
                  style={{ color: active ? "var(--argila-darkest)" : "var(--color-text-subtle)" }}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className="h-px w-4 shrink-0"
                  style={{ background: step > n ? "var(--argila-teal)" : "var(--color-border)" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="argila-section-title mb-3">Etapa 1 — Conteúdo</p>
            <textarea
              className="argila-input min-h-[120px]"
              style={{ resize: "vertical" }}
              placeholder="Descreva o que trabalhou hoje…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <FileUpload
            userId={userId}
            onUploaded={(p, t) => {
              setAttachmentPath(p);
              setAttachmentType(t);
            }}
          />

          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-muted)" }}>
              Tipo de aula
            </p>
            <div className="flex gap-2">
              {(["theoretical", "practical", "mixed"] as const).map((t) => {
                const label = t === "theoretical" ? "Teórica" : t === "practical" ? "Prática" : "Mista";
                const active = lessonType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLessonType(t)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                    style={{
                      border: `1.5px solid ${active ? "var(--argila-teal)" : "var(--color-border)"}`,
                      background: active ? "rgba(79,207,216,0.10)" : "var(--color-surface)",
                      color: active ? "var(--argila-teal-dark)" : "var(--color-text-muted)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {!summary && (
            <div className="flex flex-col gap-3">
              {aiQuestion && (
                <div className="argila-card p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3.5 shrink-0" style={{ color: "var(--argila-purple)" }} />
                    <p className="text-sm font-semibold" style={{ color: "var(--argila-darkest)" }}>
                      {aiQuestion}
                    </p>
                  </div>
                  <input
                    className="argila-input"
                    value={aiAnswer}
                    onChange={(e) => setAiAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !loading) {
                        void runAiTurn(aiAnswer);
                        setAiAnswer("");
                      }
                    }}
                    placeholder="Sua resposta…"
                  />
                  <button
                    type="button"
                    disabled={loading || !aiAnswer.trim()}
                    onClick={() => {
                      void runAiTurn(aiAnswer);
                      setAiAnswer("");
                    }}
                    className="argila-btn argila-btn-primary w-fit"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Enviar
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={loading || !content.trim()}
                  onClick={() => void runAiTurn(content)}
                  className="argila-btn argila-btn-primary"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {aiQuestion ? "Continuar com IA" : "Iniciar assistente (IA)"}
                </button>
                <button
                  type="button"
                  className="text-xs font-medium underline"
                  style={{ color: "var(--color-text-muted)" }}
                  onClick={() => {
                    setSummary(content.slice(0, 800));
                    setStep(2);
                  }}
                >
                  Pular IA
                </button>
              </div>
            </div>
          )}

          {summary && (
            <div className="argila-card p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--argila-teal-dark)" }} />
                <p className="text-sm font-bold" style={{ color: "var(--argila-darkest)" }}>Rascunho da aula</p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-secondary)" }}>
                {summary}
              </p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="argila-btn argila-btn-teal w-fit"
              >
                Próximo: público-alvo
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          <p className="argila-section-title">
            Etapa 2 — Para quem essa aula/atividade foi destinada?
          </p>

          {premium && classes.length > 0 && (
            <div className="argila-card p-4 flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                Turmas (todos os alunos entram como presentes; desmarque falta abaixo)
              </p>
              {classes.map((c) => (
                <label key={c.id} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedClassIds.has(c.id)}
                    onChange={(e) => toggleClass(c.id, e.target.checked)}
                  />
                  <span style={{ color: "var(--color-text-sec)" }}>{c.name}</span>
                </label>
              ))}
            </div>
          )}

          {targetList.length > 0 && (
            <div className="argila-card p-4 flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                Presença / falta
              </p>
              {targetList.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between py-2.5"
                  style={{
                    borderBottom: i < targetList.length - 1 ? "1px solid var(--color-border)" : "none",
                  }}
                >
                  <span className="text-sm font-medium" style={{ color: "var(--argila-darkest)" }}>
                    {s.name}
                    {classMemberIds.has(s.id) && (
                      <span className="text-[10px] ml-2 opacity-70">(turma)</span>
                    )}
                  </span>
                  <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--color-text-muted)" }}>
                    <input
                      type="checkbox"
                      checked={absent[s.id] ?? false}
                      onChange={(e) =>
                        setAbsent((o) => ({ ...o, [s.id]: e.target.checked }))
                      }
                    />
                    Falta
                  </label>
                </div>
              ))}
            </div>
          )}

          {avulsoCandidates.length > 0 && (
            <div className="argila-card p-4 flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                Incluir outros alunos (avulsos ou outras turmas)
              </p>
              {avulsoCandidates.map((s) => (
                <label key={s.id} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={extraStudentIds.has(s.id)}
                    onChange={(e) => toggleExtra(s.id, e.target.checked)}
                  />
                  <span style={{ color: "var(--color-text-sec)" }}>{s.name}</span>
                </label>
              ))}
            </div>
          )}

          <button
            type="button"
            className="argila-btn argila-btn-primary w-fit"
            onClick={goFromStep2}
            disabled={targetStudentIds.length === 0}
          >
            Próximo
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <p className="argila-section-title">Etapa 3 — Aprendizado (demonstrou entender)</p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Avalie cada aluno presente de 0 a 5.
          </p>
          <div className="flex flex-col gap-6">
            {presentIds.map((id) => {
              const s = students.find((x) => x.id === id)!;
              const r = ratings[id] ?? { comp: 3, att: 3, eng: 3 };
              return (
                <div key={id} className="argila-card p-4 flex flex-col gap-3">
                  <p className="text-sm font-semibold" style={{ color: "var(--argila-darkest)" }}>{s.name}</p>
                  <StarPicker
                    label="Aprendizado"
                    value={r.comp}
                    onChange={(n) =>
                      setRatings((o) => ({
                        ...o,
                        [id]: { ...r, comp: n },
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
          <button type="button" className="argila-btn argila-btn-primary w-fit" onClick={() => setStep(4)}>
            Próximo
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-5">
          <p className="argila-section-title">Etapa 4 — Concentração</p>
          <div className="flex flex-col gap-6">
            {presentIds.map((id) => {
              const s = students.find((x) => x.id === id)!;
              const r = ratings[id] ?? { comp: 3, att: 3, eng: 3 };
              return (
                <div key={id} className="argila-card p-4 flex flex-col gap-3">
                  <p className="text-sm font-semibold" style={{ color: "var(--argila-darkest)" }}>{s.name}</p>
                  <StarPicker
                    label="Concentração"
                    value={r.att}
                    onChange={(n) =>
                      setRatings((o) => ({
                        ...o,
                        [id]: { ...r, att: n },
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
          <button type="button" className="argila-btn argila-btn-primary w-fit" onClick={() => setStep(5)}>
            Próximo
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-5">
          <p className="argila-section-title">Etapa 5 — Engajamento</p>
          <div className="flex flex-col gap-6">
            {presentIds.map((id) => {
              const s = students.find((x) => x.id === id)!;
              const r = ratings[id] ?? { comp: 3, att: 3, eng: 3 };
              return (
                <div key={id} className="argila-card p-4 flex flex-col gap-3">
                  <p className="text-sm font-semibold" style={{ color: "var(--argila-darkest)" }}>{s.name}</p>
                  <StarPicker
                    label="Engajamento"
                    value={r.eng}
                    onChange={(n) =>
                      setRatings((o) => ({
                        ...o,
                        [id]: { ...r, eng: n },
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>
          <button type="button" className="argila-btn argila-btn-primary w-fit" onClick={() => setStep(6)}>
            Próximo
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {step === 6 && (
        <div className="flex flex-col gap-5">
          <p className="argila-section-title">Etapa 6 — Observações (opcional)</p>
          <div className="flex flex-col gap-4">
            {presentIds.map((id) => {
              const s = students.find((x) => x.id === id)!;
              return (
                <div key={id}>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-sec)" }}>
                    {s.name}
                  </label>
                  <textarea
                    className="argila-input"
                    style={{ minHeight: 72, resize: "vertical" }}
                    rows={2}
                    maxLength={500}
                    placeholder="Observação individual (opcional)…"
                    value={notes[id] ?? ""}
                    onChange={(e) =>
                      setNotes((o) => ({ ...o, [id]: e.target.value }))
                    }
                  />
                </div>
              );
            })}
          </div>
          <button type="button" className="argila-btn argila-btn-primary w-fit" onClick={() => setStep(7)}>
            Revisar
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {step === 7 && (
        <div className="flex flex-col gap-5">
          <p className="argila-section-title">Etapa 7 — Confirmar</p>
          <div className="argila-card p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 shrink-0" style={{ color: "var(--argila-teal-dark)" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--argila-darkest)" }}>
                  Tudo certo!
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-secondary)" }}>
                  {targetStudentIds.length} aluno(s) no diário · resumo individual por aluno presente.
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void submitDiary()}
            className="argila-btn argila-btn-teal"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Salvar diário
          </button>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{
            background: "rgba(226,75,75,0.07)",
            borderColor: "rgba(226,75,75,0.20)",
            color: "var(--color-error)",
          }}
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
}
