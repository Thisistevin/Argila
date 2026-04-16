import Anthropic from "@anthropic-ai/sdk";
import { MODEL_HAIKU, PROMPT_DIARY_FINALIZE } from "@/lib/ai/config";

export type FinalizeStudent = { id: string; name: string };

export type FinalizeDiarySummariesInput = {
  content: string;
  lessonType: string;
  draftSummary: string;
  students: FinalizeStudent[];
  notesByStudent: Record<string, string>;
};

function countNameMentions(text: string, name: string): number {
  if (!name.trim()) return 0;
  let c = 0;
  let i = 0;
  while (i < text.length) {
    const j = text.indexOf(name, i);
    if (j < 0) break;
    c++;
    i = j + name.length;
  }
  return c;
}

/** Garante nome explícito e segunda menção quando a IA falha. */
export function applyDiarySummaryFallbacks(
  summaries: Record<string, string>,
  students: FinalizeStudent[],
  contentSnippet: string
): Record<string, string> {
  const snippet = contentSnippet.replace(/\s+/g, " ").trim().slice(0, 140);
  const out: Record<string, string> = { ...summaries };
  for (const s of students) {
    let t = (out[s.id] ?? "").trim();
    if (!t || !t.includes(s.name)) {
      t = `${s.name} participou da aula sobre: ${snippet || "conteúdo registado"}.`;
    }
    if (countNameMentions(t, s.name) < 2) {
      t = `${t}\n\nRegisto pedagógico: ${s.name} integra este diário de aula.`;
    }
    out[s.id] = t;
  }
  return out;
}

const system = `Você gera resumos curtos de aula por aluno, em português.
Responda APENAS JSON válido no formato:
{"summaries":[{"student_id":"uuid","summary":"texto em 2-4 frases"}]}
Regras:
- Uma entrada por aluno listado no contexto.
- Cada summary deve citar explicitamente o nome daquele aluno no texto.
- Nunca use "Aluno 1", "Aluno 2", "participante" ou placeholders genéricos.
- Tom objetivo e pedagógico.
- Use as observações do professor quando existirem para aquele aluno.`;

export async function finalizeDiarySummariesWithNames(
  input: FinalizeDiarySummariesInput
): Promise<Record<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return applyDiarySummaryFallbacks(
      {},
      input.students,
      input.content
    );
  }

  if (input.students.length === 0) return {};

  const payload = {
    content: input.content,
    lesson_type: input.lessonType,
    draft_summary: input.draftSummary,
    students: input.students.map((s) => ({
      id: s.id,
      name: s.name,
      teacher_note: (input.notesByStudent[s.id] ?? "").trim() || null,
    })),
  };

  const anthropic = new Anthropic({ apiKey });
  try {
    const msg = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 2048,
      system: `${system}\nprompt_version: ${PROMPT_DIARY_FINALIZE}`,
      messages: [
        {
          role: "user",
          content: `Gere os resumos individuais.\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
    });
    const text =
      msg.content[0].type === "text" ? msg.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as {
      summaries?: Array<{ student_id?: string; summary?: string }>;
    };
    const map: Record<string, string> = {};
    for (const row of parsed.summaries ?? []) {
      const sid = row.student_id?.trim();
      const sum = row.summary?.trim();
      if (sid && sum) map[sid] = sum;
    }
    return applyDiarySummaryFallbacks(map, input.students, input.content);
  } catch {
    return applyDiarySummaryFallbacks(
      {},
      input.students,
      input.content
    );
  }
}
