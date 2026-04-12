"use client";

import { useMemo, useState } from "react";
import { completeDiary } from "@/actions/diary";
import { FileUpload } from "@/components/diary/FileUpload";
import { Send, ChevronRight, Loader2, Sparkles, CheckCircle2 } from "lucide-react";

type StudentRow = { id: string; name: string };

const STEP_LABELS = ["Conteúdo", "Participantes", "Presença", "Observações", "Confirmar"];

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
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(() => new Set());
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(() => new Set());
  const [absent, setAbsent] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedList = useMemo(
    () => students.filter((s) => selectedStudents.has(s.id)),
    [students, selectedStudents]
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

  async function submitDiary() {
    setLoading(true);
    setError(null);
    const ids = [...selectedStudents];
    const rows = ids.map((id) => ({
      studentId: id,
      absent: absent[id] ?? false,
      note: notes[id] || undefined,
    }));
    const result = await completeDiary({
      content,
      lessonType,
      aiSummary: summary || content.slice(0, 500),
      attachment_storage_path: attachmentPath,
      attachment_content_type: attachmentType,
      studentIds: ids,
      classIds: premium ? [...selectedClasses] : undefined,
      rows,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.href = "/diario";
  }

  return (
    <div className="flex flex-col gap-8 max-w-xl">

      {/* ── Stepper ── */}
      <div className="flex items-center gap-2">
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
                  className="text-xs font-medium hidden sm:block"
                  style={{ color: active ? "var(--argila-darkest)" : "var(--color-text-subtle)" }}
                >
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className="h-px w-6 shrink-0"
                  style={{ background: step > n ? "var(--argila-teal)" : "var(--color-border)" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Etapa 1: Conteúdo ── */}
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
            onUploaded={(p, t) => { setAttachmentPath(p); setAttachmentType(t); }}
          />

          {/* Tipo de aula */}
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

          {/* Diálogo IA */}
          {!summary && (
            <div className="flex flex-col gap-3">
              {aiQuestion && (
                <div
                  className="argila-card p-4 flex flex-col gap-3"
                >
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
                    onClick={() => { void runAiTurn(aiAnswer); setAiAnswer(""); }}
                    className="argila-btn argila-btn-primary w-fit"
                  >
                    {loading
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Send className="size-4" />}
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
                  {loading
                    ? <Loader2 className="size-4 animate-spin" />
                    : <Sparkles className="size-4" />}
                  {aiQuestion ? "Continuar com IA" : "Iniciar assistente (IA)"}
                </button>
                <button
                  type="button"
                  className="text-xs font-medium underline"
                  style={{ color: "var(--color-text-muted)" }}
                  onClick={() => { setSummary(content.slice(0, 800)); setStep(2); }}
                >
                  Pular IA
                </button>
              </div>
            </div>
          )}

          {/* Resumo gerado */}
          {summary && (
            <div className="argila-card p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" style={{ color: "var(--argila-teal-dark)" }} />
                <p className="text-sm font-bold" style={{ color: "var(--argila-darkest)" }}>Resumo gerado</p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-secondary)" }}>
                {summary}
              </p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="argila-btn argila-btn-teal w-fit"
              >
                Próximo: participantes
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Etapa 2: Participantes ── */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <p className="argila-section-title">Etapa 2 — Participantes</p>

          {premium && classes.length > 0 && (
            <div className="argila-card p-4 flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                Turmas
              </p>
              {classes.map((c) => (
                <label key={c.id} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedClasses.has(c.id)}
                    onChange={(e) => {
                      const n = new Set(selectedClasses);
                      if (e.target.checked) n.add(c.id); else n.delete(c.id);
                      setSelectedClasses(n);
                    }}
                  />
                  <span style={{ color: "var(--color-text-sec)" }}>{c.name}</span>
                </label>
              ))}
            </div>
          )}

          <div className="argila-card p-4 flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
              Alunos
            </p>
            {students.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Nenhum aluno cadastrado.</p>
            ) : (
              students.map((s) => (
                <label key={s.id} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedStudents.has(s.id)}
                    onChange={(e) => {
                      const n = new Set(selectedStudents);
                      if (e.target.checked) n.add(s.id); else n.delete(s.id);
                      setSelectedStudents(n);
                    }}
                  />
                  <span style={{ color: "var(--color-text-sec)" }}>{s.name}</span>
                </label>
              ))
            )}
          </div>

          <button
            type="button"
            className="argila-btn argila-btn-primary w-fit"
            onClick={() => setStep(3)}
            disabled={selectedStudents.size === 0}
          >
            Próximo
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* ── Etapa 3: Presença ── */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          <p className="argila-section-title">Etapa 3 — Presença</p>
          <div className="argila-card p-4 flex flex-col gap-1">
            {selectedList.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center justify-between py-2.5"
                style={{
                  borderBottom: i < selectedList.length - 1 ? "1px solid var(--color-border)" : "none",
                }}
              >
                <span className="text-sm font-medium" style={{ color: "var(--argila-darkest)" }}>
                  {s.name}
                </span>
                <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--color-text-muted)" }}>
                  <input
                    type="checkbox"
                    checked={absent[s.id] ?? false}
                    onChange={(e) => setAbsent((o) => ({ ...o, [s.id]: e.target.checked }))}
                  />
                  Falta
                </label>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="argila-btn argila-btn-primary w-fit"
            onClick={() => setStep(selectedList.length <= 10 && selectedList.length >= 1 ? 4 : 5)}
          >
            Próximo
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* ── Etapa 4: Observações ── */}
      {step === 4 && selectedList.length <= 10 && (
        <div className="flex flex-col gap-5">
          <p className="argila-section-title">Etapa 4 — Observações (opcional)</p>
          <div className="flex flex-col gap-4">
            {selectedList.map((s) => (
              <div key={s.id}>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--color-text-sec)" }}>
                  {s.name}
                </label>
                <textarea
                  className="argila-input"
                  style={{ minHeight: 72, resize: "vertical" }}
                  rows={2}
                  maxLength={500}
                  placeholder="Observação individual (opcional)…"
                  value={notes[s.id] ?? ""}
                  onChange={(e) => setNotes((o) => ({ ...o, [s.id]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="argila-btn argila-btn-primary w-fit"
            onClick={() => setStep(5)}
          >
            Revisar
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* ── Etapa 5: Confirmar ── */}
      {step === 5 && (
        <div className="flex flex-col gap-5">
          <p className="argila-section-title">Etapa 5 — Confirmar</p>
          <div className="argila-card p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 shrink-0" style={{ color: "var(--argila-teal-dark)" }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--argila-darkest)" }}>
                  Tudo certo!
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-secondary)" }}>
                  {selectedList.length} aluno{selectedList.length > 1 ? "s" : ""} · Resumo será salvo com o diário.
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

      {/* ── Erro ── */}
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
