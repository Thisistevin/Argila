"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Trash2, MoveRight } from "lucide-react";

interface ClassOption {
  id: string;
  name: string;
}

interface Props {
  student: { id: string; name: string };
  currentClassId: string | null;
  otherClasses: ClassOption[];
  deleteStudentAction: (formData: FormData) => void | Promise<void>;
  setClassAction: (formData: FormData) => void | Promise<void>;
}

export function StudentActionsMenu({
  student,
  currentClassId,
  otherClasses,
  deleteStudentAction,
  setClassAction,
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
            minWidth: 200,
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
          {/* Remover da turma */}
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
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(226,75,75,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Trash2 style={{ width: 12, height: 12, flexShrink: 0 }} />
                Remover da turma
              </button>
            </form>
          )}

          {/* Mover para outra turma */}
          {otherClasses.length > 0 && (
            <form
              action={setClassAction}
              className="flex flex-col"
              style={{ gap: "var(--space-1)", padding: "var(--space-1) var(--space-2)" }}
            >
              <input type="hidden" name="student_id" value={student.id} />
              <select
                name="class_id"
                className="argila-input"
                style={{ fontSize: "var(--text-xs)", padding: "3px 6px", height: 28 }}
              >
                {!currentClassId && <option value="">Sem turma</option>}
                {otherClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
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

          {/* Separador antes de excluir */}
          {(currentClassId || otherClasses.length > 0) && (
            <div style={{ height: 1, background: "var(--color-border)", margin: "var(--space-1) 0" }} />
          )}

          {/* Excluir aluno */}
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
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(226,75,75,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
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
