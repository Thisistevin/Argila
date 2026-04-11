"use client";

import { useMemo, useState } from "react";
import { completeDiary } from "@/actions/diary";
import { FileUpload } from "@/components/diary/FileUpload";

type StudentRow = { id: string; name: string };

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
  const [lessonType, setLessonType] = useState<
    "theoretical" | "practical" | "mixed"
  >("mixed");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    () => new Set()
  );
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(
    () => new Set()
  );
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
        body: JSON.stringify({
          userText: userLine,
          history: aiHistory,
        }),
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
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold" style={{ color: "var(--argila-darkest)" }}>
            Etapa 1 — Conteúdo
          </h2>
          <textarea
            className="min-h-32 rounded-xl border p-3 text-sm"
            style={{ borderColor: "var(--color-border)" }}
            placeholder="Descreva o que trabalhou hoje…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <FileUpload
            userId={userId}
            onUploaded={(p, t) => {
              setAttachmentPath(p);
              setAttachmentType(t);
            }}
          />
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm">Tipo de aula:</span>
            {(["theoretical", "practical", "mixed"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setLessonType(t)}
                className="rounded-lg border px-3 py-1 text-xs capitalize"
                style={{
                  borderColor: lessonType === t ? "var(--argila-teal)" : "var(--color-border)",
                  background: lessonType === t ? "var(--argila-teal-light)" : "transparent",
                }}
              >
                {t === "theoretical" ? "Teórica" : t === "practical" ? "Prática" : "Mista"}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="text-sm underline"
            style={{ color: "var(--color-text-muted)" }}
            onClick={() => {
              setSummary(content.slice(0, 800));
              setStep(2);
            }}
          >
            Pular assistente de IA
          </button>
          {!summary && (
            <>
              {aiQuestion && (
                <div
                  className="rounded-xl border p-4 text-sm"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-surface)",
                  }}
                >
                  <p className="mb-2 font-medium">{aiQuestion}</p>
                  <input
                    className="w-full rounded border px-3 py-2 text-sm mb-2"
                    style={{ borderColor: "var(--color-border)" }}
                    value={aiAnswer}
                    onChange={(e) => setAiAnswer(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      void runAiTurn(aiAnswer);
                      setAiAnswer("");
                    }}
                    className="text-sm font-medium text-white rounded-lg px-4 py-2"
                    style={{ background: "var(--argila-indigo)" }}
                  >
                    Enviar
                  </button>
                </div>
              )}
              <button
                type="button"
                disabled={loading || !content.trim()}
                onClick={() => void runAiTurn(content)}
                className="text-sm font-semibold text-white rounded-xl px-5 py-3 w-fit"
                style={{ background: "var(--argila-indigo)" }}
              >
                {aiQuestion ? "Continuar com IA" : "Iniciar assistente (IA)"}
              </button>
            </>
          )}
          {summary && (
            <div
              className="rounded-xl border p-4 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p className="font-medium mb-2">Resumo</p>
              <p style={{ color: "var(--color-text-muted)" }}>{summary}</p>
              <button
                type="button"
                className="mt-4 text-sm font-semibold text-white rounded-lg px-4 py-2"
                style={{ background: "var(--argila-teal)" }}
                onClick={() => setStep(2)}
              >
                Próximo: participantes
              </button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold">Etapa 2 — Participantes</h2>
          {premium && classes.length > 0 && (
            <div>
              <p className="text-xs uppercase mb-2 text-muted">Turmas</p>
              {classes.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedClasses.has(c.id)}
                    onChange={(e) => {
                      const n = new Set(selectedClasses);
                      if (e.target.checked) n.add(c.id);
                      else n.delete(c.id);
                      setSelectedClasses(n);
                    }}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}
          <p className="text-xs uppercase">Alunos</p>
          {students.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedStudents.has(s.id)}
                onChange={(e) => {
                  const n = new Set(selectedStudents);
                  if (e.target.checked) n.add(s.id);
                  else n.delete(s.id);
                  setSelectedStudents(n);
                }}
              />
              {s.name}
            </label>
          ))}
          <button
            type="button"
            className="rounded-xl px-5 py-3 text-sm font-semibold text-white w-fit"
            style={{ background: "var(--argila-indigo)" }}
            onClick={() => setStep(3)}
            disabled={selectedStudents.size === 0}
          >
            Próximo
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold">Etapa 3 — Presença</h2>
          {selectedList.map((s) => (
            <div key={s.id} className="flex items-center gap-3 text-sm">
              <span className="flex-1">{s.name}</span>
              <label className="flex items-center gap-1">
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
          <button
            type="button"
            className="rounded-xl px-5 py-3 text-sm font-semibold text-white w-fit"
            style={{ background: "var(--argila-indigo)" }}
            onClick={() =>
              setStep(selectedList.length <= 10 && selectedList.length >= 1 ? 4 : 5)
            }
          >
            Próximo
          </button>
        </div>
      )}

      {step === 4 && selectedList.length <= 10 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold">Etapa 4 — Observações (opcional)</h2>
          {selectedList.map((s) => (
            <div key={s.id}>
              <label className="text-xs block mb-1">{s.name}</label>
              <textarea
                className="w-full rounded border p-2 text-sm"
                style={{ borderColor: "var(--color-border)" }}
                rows={2}
                maxLength={500}
                value={notes[s.id] ?? ""}
                onChange={(e) =>
                  setNotes((o) => ({ ...o, [s.id]: e.target.value }))
                }
              />
            </div>
          ))}
          <button
            type="button"
            className="rounded-xl px-5 py-3 text-sm font-semibold text-white w-fit"
            style={{ background: "var(--argila-indigo)" }}
            onClick={() => setStep(5)}
          >
            Revisar
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold">Confirmar</h2>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {selectedList.length} aluno(s). Resumo será salvo com o diário.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void submitDiary()}
            className="rounded-xl px-5 py-3 text-sm font-semibold text-white w-fit"
            style={{ background: "var(--argila-teal)" }}
          >
            Salvar diário
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
