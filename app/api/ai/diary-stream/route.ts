import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { MODEL_HAIKU, PROMPT_DIARY } from "@/lib/ai/config";
import { createClient } from "@/lib/supabase/server";

const system = `Você é um assistente para professores registrarem aulas. Etapa 1 apenas: conteúdo e método de ensino.
Responda SEMPRE um único objeto JSON por mensagem:
{"step":1,"question":"texto ou null","is_last":false,"lesson_type":"theoretical"|"practical"|"mixed"|null,"summary":null}

Regras da Etapa 1:
- Pergunte APENAS sobre o que foi trabalhado e como foi trabalhado (máximo 3 perguntas no total na conversa).
- Só faça pergunta adicional se a primeira descrição estiver vaga.
- NUNCA pergunte: quantos alunos participaram, nível dos alunos, desempenho individual, notas, presença ou falta, nomes de participantes.
- NUNCA use placeholders como "Aluno 1", "Aluno 2" ou "participante 1".
- Quando o professor mencionar nomes reais no texto, preserve-os, mas não solicite lista de alunos.

Na última mensagem da etapa 1 use is_last: true e summary com um rascunho curto da aula (será refinado depois com os participantes reais); question pode ser null.
O campo lesson_type deve refletir a aula quando já estiver claro, senão null.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "IA não configurada no servidor" },
      { status: 503 }
    );
  }

  let body: { userText?: string; history?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const msg = await anthropic.messages.create({
      model: MODEL_HAIKU,
      max_tokens: 1024,
      system: `${system}\nprompt_version: ${PROMPT_DIARY}`,
      messages: [
        {
          role: "user",
          content: body.history
            ? `Contexto:\n${body.history}\n\nNova resposta do professor:\n${body.userText ?? ""}`
            : (body.userText ?? ""),
        },
      ],
    });
    const text =
      msg.content[0].type === "text" ? msg.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const json = jsonMatch ? jsonMatch[0] : text;
    try {
      return NextResponse.json(JSON.parse(json));
    } catch {
      return NextResponse.json(
        { step: 1, question: text, is_last: false, lesson_type: null, summary: null },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error("diary-stream: Anthropic call failed", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { step: 1, question: "Desculpe, houve um erro ao processar. Tente novamente.", is_last: false, lesson_type: null, summary: null },
      { status: 200 }
    );
  }
}
