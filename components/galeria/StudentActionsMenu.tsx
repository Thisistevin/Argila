"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Trash2, MoveRight, Route } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
}

export type JourneyMenuDef = {
  id: string;
  name: string;
  milestones: Array<{ id: string; name: string }>;
};

interface Props {
  student: { id: string; name: string };
  currentClassId: string | null;
  otherClasses: ClassOption[];
  deleteStudentAction: (formData: FormData) => void | Promise<void>;
  setClassAction: (formData: FormData) => void | Promise<void>;
  journeys?: JourneyMenuDef[];
  currentJourneys?: Array<{ journeyId: string; milestoneId: string | null }>;
  setMilestoneAction?: (formData: FormData) => void | Promise<void>;
  assignJourneyAction?: (formData: FormData) => void | Promise<void>;
}

export function StudentActionsMenu({
  student,
  currentClassId,
  otherClasses,
  deleteStudentAction,
  setClassAction,
  journeys = [],
  currentJourneys = [],
  setMilestoneAction,
  assignJourneyAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const assignedIds = new Set(currentJourneys.map((c) => c.journeyId));
  const toAssign = journeys.filter((j) => !assignedIds.has(j.id));
  const showJourneys =
    journeys.length > 0 && setMilestoneAction && assignJourneyAction;

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Ações do aluno"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          background: open ? "var(--color-border)" : "rgba(255,255,255,0.85)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
          backdropFilter: "blur(4px)",
        }}
      >
        <MoreVertical style={{ width: 14, height: 14 }} />
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: 32,
            right: 0,
            zIndex: 50,
            minWidth: 220,
            maxHeight: "min(70vh, 420px)",
            overflowY: "auto",
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            padding: "var(--space-1)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
          }}
        >
          {currentClassId && (
            <form action={setClassAction}>
              <input type="hidden" name="student_id" value={student.id} />
              <input type="hidden" name="class_id" value="" />
              <button
                type="submit"
                role="menuitem"
                className="flex items-center font-semibold w-full"
                style={{
                  background: "transparent",
                  color: "var(--color-error)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-2) var(--space-3)",
                  fontSize: "var(--text-xs)",
                  gap: "var(--space-2)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(226,75,75,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <Trash2 style={{ width: 12, height: 12, flexShrink: 0 }} />
                Remover da turma
              </button>
            </form>
          )}

          {otherClasses.length > 0 && (
            <form
              action={setClassAction}
              className="flex flex-col"
              style={{ gap: "var(--space-1)", padding: "var(--space-1) var(--space-2)" }}
            >
              <input type="hidden" name="student_id" value={student.id} />
              <select
                name="class_id"
                className="argila-input argila-input-compact"
                style={{ fontSize: "var(--text-xs)" }}
              >
                {!currentClassId && <option value="">Sem turma</option>}
                {otherClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                role="menuitem"
                className="flex items-center font-semibold"
                style={{
                  background: "rgba(62,57,145,0.08)",
                  color: "var(--argila-indigo)",
                  border: "1px solid rgba(62,57,145,0.16)",
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-1) var(--space-2)",
                  fontSize: "var(--text-xs)",
                  gap: "var(--space-2)",
                  cursor: "pointer",
                  height: 28,
                }}
              >
                <MoveRight style={{ width: 11, height: 11 }} />
                Mover
              </button>
            </form>
          )}

          {showJourneys && (
            <>
              {(currentClassId || otherClasses.length > 0) && (
                <div style={{ height: 1, background: "var(--color-border)", margin: "var(--space-1) 0" }} />
              )}
              <div style={{ padding: "var(--space-2) var(--space-3)" }}>
                <div className="flex items-center gap-1.5" style={{ marginBottom: "var(--space-2)" }}>
                  <Route style={{ width: 12, height: 12, color: "var(--argila-purple)" }} />
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--argila-darkest)" }}>
                    Jornadas
                  </span>
                </div>
                {toAssign.length > 0 && (
                  <form
                    action={assignJourneyAction}
                    className="flex flex-col gap-1.5"
                    style={{ marginBottom: "var(--space-3)" }}
                  >
                    <input type="hidden" name="student_id" value={student.id} />
                    <span style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 600 }}>
                      Atribuir jornada
                    </span>
                    <select
                      name="journey_id"
                      required
                      className="argila-input argila-input-compact"
                      style={{ fontSize: "var(--text-xs)" }}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Escolher…
                      </option>
                      {toAssign.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="argila-btn argila-btn-primary"
                      style={{ height: 28, fontSize: "10px", padding: "0 10px" }}
                    >
                      Atribuir
                    </button>
                  </form>
                )}
                {currentJourneys.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span style={{ fontSize: "10px", color: "var(--color-text-muted)", fontWeight: 600 }}>
                      Etapas atuais
                    </span>
                    {currentJourneys.map((cj) => {
                      const def = journeys.find((j) => j.id === cj.journeyId);
                      if (!def) return null;
                      return (
                        <form
                          key={cj.journeyId}
                          action={setMilestoneAction}
                          className="flex flex-col gap-1 rounded-md p-2"
                          style={{
                            background: "rgba(125,99,175,0.06)",
                            border: "1px solid rgba(125,99,175,0.12)",
                          }}
                        >
                          <input type="hidden" name="student_id" value={student.id} />
                          <input type="hidden" name="journey_id" value={cj.journeyId} />
                          <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--argila-darkest)" }}>
                            {def.name}
                          </span>
                          <select
                            name="milestone_id"
                            className="argila-input argila-input-compact"
                            style={{ fontSize: "var(--text-xs)" }}
                            defaultValue={cj.milestoneId ?? ""}
                          >
                            <option value="">Não iniciado</option>
                            {def.milestones.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="argila-btn argila-btn-ghost"
                            style={{ height: 28, fontSize: "10px", padding: "0 8px" }}
                          >
                            Definir etapa
                          </button>
                        </form>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {(currentClassId || otherClasses.length > 0 || showJourneys) && (
            <div style={{ height: 1, background: "var(--color-border)", margin: "var(--space-1) 0" }} />
          )}

          <form action={deleteStudentAction}>
            <input type="hidden" name="id" value={student.id} />
            <button
              type="submit"
              role="menuitem"
              className="flex items-center font-semibold w-full"
              style={{
                background: "transparent",
                color: "var(--color-error)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-2) var(--space-3)",
                fontSize: "var(--text-xs)",
                gap: "var(--space-2)",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(226,75,75,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <Trash2 style={{ width: 12, height: 12, flexShrink: 0 }} />
              Excluir aluno
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
