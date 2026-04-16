import { beforeEach, describe, expect, it, vi } from "vitest";

const { anthropicCreateSpy } = vi.hoisted(() => ({
  anthropicCreateSpy: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = {
      create: anthropicCreateSpy,
    };
  }

  return { default: MockAnthropic };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { POST } from "@/app/api/ai/diary-stream/route";

function makeClient(userId: string | null = "prof-1") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
  };
}

describe("app/api/ai/diary-stream/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("retorna 401 quando não há usuário autenticado", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient(null) as never);

    const req = new Request("http://localhost/api/ai/diary-stream", {
      method: "POST",
      body: JSON.stringify({ userText: "oi" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "Não autenticado" });
  });

  it("retorna 503 quando a IA não está configurada", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient() as never);

    const req = new Request("http://localhost/api/ai/diary-stream", {
      method: "POST",
      body: JSON.stringify({ userText: "oi" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json).toEqual({ error: "IA não configurada no servidor" });
  });

  it("retorna 400 para JSON inválido", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient() as never);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");

    const req = new Request("http://localhost/api/ai/diary-stream", {
      method: "POST",
      body: "{",
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: "JSON inválido" });
  });

  it("retorna o JSON produzido pela IA quando a resposta é válida", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient() as never);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    anthropicCreateSpy.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"step":1,"question":"Qual vocabulário específico vocês trabalharam e como apresentou as palavras?","is_last":false,"lesson_type":"theoretical","summary":null}',
        },
      ],
    });

    const req = new Request("http://localhost/api/ai/diary-stream", {
      method: "POST",
      body: JSON.stringify({ userText: "Aula de vocabulário" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      step: 1,
      question:
        "Qual vocabulário específico vocês trabalharam e como apresentou as palavras?",
      is_last: false,
      lesson_type: "theoretical",
      summary: null,
    });
  });

  it("faz fallback para pergunta simples quando a IA responde texto não-JSON", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient() as never);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    anthropicCreateSpy.mockResolvedValue({
      content: [{ type: "text", text: "Conte como foi a aula." }],
    });

    const req = new Request("http://localhost/api/ai/diary-stream", {
      method: "POST",
      body: JSON.stringify({ userText: "Aula mista" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      step: 1,
      question: "Conte como foi a aula.",
      is_last: false,
      lesson_type: null,
      summary: null,
    });
  });

  it("deveria degradar com resposta HTTP controlada quando o provedor de IA falha", async () => {
    vi.mocked(createClient).mockResolvedValue(makeClient() as never);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    anthropicCreateSpy.mockRejectedValue(new Error("anthropic down"));

    const req = new Request("http://localhost/api/ai/diary-stream", {
      method: "POST",
      body: JSON.stringify({ userText: "Aula de revisão" }),
      headers: { "content-type": "application/json" },
    });

    await expect(POST(req)).resolves.toBeInstanceOf(Response);
  });
});
