"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const supabase = createClient();
    const next = nextPath || "/diario";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setLoading(false);
    if (error) setMsg(error.message);
    else setMsg("Verifique seu e-mail para o link de acesso.");
  }

  async function google() {
    setLoading(true);
    const supabase = createClient();
    const next = nextPath || "/diario";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) setMsg(error.message);
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={magicLink} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: "var(--color-border)" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--argila-indigo)" }}
        >
          Enviar magic link
        </button>
      </form>
      <button
        type="button"
        onClick={google}
        disabled={loading}
        className="rounded-xl border py-3 text-sm font-medium disabled:opacity-50"
        style={{ borderColor: "var(--color-border)" }}
      >
        Continuar com Google
      </button>
      {msg && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {msg}
        </p>
      )}
    </div>
  );
}
