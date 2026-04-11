import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { MODEL_HAIKU, PROMPT_DIARY } from "@/lib/ai/config";
import { createClient } from "@/lib/supabase/server";

const system = `Você é um assistente para professores registrarem aulas. Máximo 5 etapas, rápido.
Responda SEMPRE um único objeto JSON por mensagem: {"step":1-5,"question":"texto ou null","is_last":false,"lesson_type":"theoretical"|"practical"|"mixed"|null,"summary":null}
Na última mensagem use is_last true e summary com resumo da aula; question pode ser null.
Etapa 1: pedir conteúdo. Etapas seguintes: participantes, desempenho adaptado ao lesson_type, notas curtas.`;

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
}
