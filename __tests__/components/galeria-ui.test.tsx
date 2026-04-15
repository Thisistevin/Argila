// @vitest-environment jsdom

import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { CollapsibleSection } from "@/components/galeria/CollapsibleSection";
import { StudentActionsMenu } from "@/components/galeria/StudentActionsMenu";

describe("Galeria UI components", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.innerHTML = "";
    document.body.appendChild(container);
  });

  it("CollapsibleSection começa colapsada e alterna ao clicar", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <CollapsibleSection
          header={<span>Seção</span>}
          defaultOpen={false}
        >
          <div>Conteúdo interno</div>
        </CollapsibleSection>
      );
    });

    const button = container.querySelector("button");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("Conteúdo interno");

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("Conteúdo interno");
  });

  it("StudentActionsMenu abre, mostra ações corretas e fecha ao clicar fora", async () => {
    const root = createRoot(container);
    const deleteStudentAction = vi.fn();
    const setClassAction = vi.fn();

    await act(async () => {
      root.render(
        <StudentActionsMenu
          student={{ id: "s1", name: "Ana" }}
          currentClassId={"c1"}
          otherClasses={[{ id: "c2", name: "Turma B" }]}
          deleteStudentAction={deleteStudentAction}
          setClassAction={setClassAction}
        />
      );
    });

    const menuButton = container.querySelector(
      'button[aria-label="Ações do aluno"]'
    );
    expect(menuButton).not.toBeNull();

    await act(async () => {
      menuButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Remover da turma");
    expect(container.textContent).toContain("Mover");
    expect(container.textContent).toContain("Excluir aluno");
    expect(
      container.querySelector('input[name="student_id"][value="s1"]')
    ).not.toBeNull();
    expect(
      container.querySelector('input[name="class_id"][value=""]')
    ).not.toBeNull();

    await act(async () => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(container.textContent).not.toContain("Remover da turma");
  });

  it("StudentActionsMenu em aluno sem turma mostra apenas mover/excluir quando há turmas disponíveis", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <StudentActionsMenu
          student={{ id: "s2", name: "Bruno" }}
          currentClassId={null}
          otherClasses={[{ id: "c1", name: "Turma A" }]}
          deleteStudentAction={vi.fn()}
          setClassAction={vi.fn()}
        />
      );
    });

    const menuButton = container.querySelector(
      'button[aria-label="Ações do aluno"]'
    );

    await act(async () => {
      menuButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).not.toContain("Remover da turma");
    expect(container.textContent).toContain("Mover");
    expect(container.textContent).toContain("Excluir aluno");
  });

  it("StudentActionsMenu aplica a variante compacta nos selects de jornada", async () => {
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <StudentActionsMenu
          student={{ id: "s3", name: "Caio" }}
          currentClassId={"c1"}
          otherClasses={[{ id: "c2", name: "Turma B" }]}
          deleteStudentAction={vi.fn()}
          setClassAction={vi.fn()}
          journeys={[
            {
              id: "j1",
              name: "Inglês B1",
              milestones: [
                { id: "m1", name: "Marco da Narração (Fluidez Temporal)" },
                { id: "m2", name: "Marco da Argumentação (Opiniões e Hipóteses)" },
              ],
            },
            {
              id: "j2",
              name: "Conversação",
              milestones: [{ id: "m3", name: "Primeiros turnos longos" }],
            },
          ]}
          currentJourneys={[{ journeyId: "j1", milestoneId: "m1" }]}
          setMilestoneAction={vi.fn()}
          assignJourneyAction={vi.fn()}
        />
      );
    });

    const menuButton = container.querySelector('button[aria-label="Ações do aluno"]');

    await act(async () => {
      menuButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const selects = [...container.querySelectorAll("select")];
    expect(selects).toHaveLength(3);
    selects.forEach((select) => {
      expect(select.className).toContain("argila-input-compact");
    });
  });
});
