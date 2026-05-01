"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/actions/profile";
import { applyPhoneMask } from "@/lib/phone";

type Msg = { type: "success" | "error"; text: string } | null;

function MsgBox({ msg }: { msg: NonNullable<Msg> }) {
  return (
    <p
      className="rounded-xl px-4 py-3 text-sm"
      style={
        msg.type === "success"
          ? {
              background: "rgba(39,176,139,0.08)",
              color: "var(--color-success)",
              border: "1px solid rgba(39,176,139,0.20)",
            }
          : {
              background: "rgba(226,75,75,0.08)",
              color: "var(--color-error)",
              border: "1px solid rgba(226,75,75,0.18)",
            }
      }
    >
      {msg.text}
    </p>
  );
}

export function ProfileForm({
  initialName,
  initialPhone,
  currentEmail,
  hasPassword,
}: {
  initialName: string;
  initialPhone: string;
  currentEmail: string;
  hasPassword: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ? applyPhoneMask(initialPhone) : "");
  const [infoMsg, setInfoMsg] = useState<Msg>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<Msg>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<Msg>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInfoMsg(null);
    if (!name.trim()) {
      setInfoMsg({ type: "error", text: "O nome não pode estar vazio." });
      return;
    }
    setInfoLoading(true);
    const result = await updateProfile({ name: name.trim(), phone: phone.trim() });
    setInfoLoading(false);
    if (result.ok) {
      setInfoMsg({ type: "success", text: "Informações atualizadas com sucesso." });
    } else {
      setInfoMsg({ type: "error", text: result.error });
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg(null);
    const trimmed = newEmail.trim();
    if (!trimmed || trimmed === currentEmail) {
      setEmailMsg({ type: "error", text: "Insira um email diferente do atual." });
      return;
    }
    setEmailLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setEmailLoading(false);
    if (error) {
      setEmailMsg({ type: "error", text: error.message });
    } else {
      setEmailMsg({
        type: "success",
        text: `Verifique o email ${trimmed} para confirmar a mudança.`,
      });
      setNewEmail("");
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "A nova senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ type: "error", text: "As novas senhas não coincidem." });
      return;
    }
    setPasswordLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    });
    if (authError) {
      setPasswordLoading(false);
      setPasswordMsg({ type: "error", text: "Senha atual incorreta." });
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (updateError) {
      setPasswordMsg({ type: "error", text: updateError.message });
    } else {
      setPasswordMsg({ type: "success", text: "Senha alterada com sucesso." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    }
  }

  const sectionStyle = {
    borderColor: "var(--color-border)",
    background: "var(--color-surface)",
  };

  const labelStyle = { color: "var(--color-text-muted)" };
  const titleStyle = { color: "var(--argila-darkest)" };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border p-6" style={sectionStyle}>
        <h2 className="mb-4 text-base font-semibold" style={titleStyle}>
          Informações pessoais
        </h2>
        <form onSubmit={handleInfoSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={labelStyle}>
              Nome
            </label>
            <input
              type="text"
              required
              placeholder="Seu nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="argila-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={labelStyle}>
              Telefone
            </label>
            <input
              type="tel"
              placeholder="+55 11 99999-9999"
              value={phone}
              onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
              className="argila-input"
            />
          </div>
          {infoMsg && <MsgBox msg={infoMsg} />}
          <button
            type="submit"
            disabled={infoLoading}
            className="argila-btn argila-btn-primary self-start"
          >
            {infoLoading ? "Salvando…" : "Salvar"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border p-6" style={sectionStyle}>
        <h2 className="mb-1 text-base font-semibold" style={titleStyle}>
          Endereço de email
        </h2>
        <p className="mb-4 text-sm" style={labelStyle}>
          Email atual:{" "}
          <span className="font-medium" style={titleStyle}>
            {currentEmail}
          </span>
        </p>
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={labelStyle}>
              Novo email
            </label>
            <input
              type="email"
              required
              placeholder="novo@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="argila-input"
            />
          </div>
          {emailMsg && <MsgBox msg={emailMsg} />}
          <button
            type="submit"
            disabled={emailLoading}
            className="argila-btn argila-btn-primary self-start"
          >
            {emailLoading ? "Enviando…" : "Enviar confirmação"}
          </button>
        </form>
      </section>

      {hasPassword && <section className="rounded-2xl border p-6" style={sectionStyle}>
        <h2 className="mb-4 text-base font-semibold" style={titleStyle}>
          Alterar senha
        </h2>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={labelStyle}>
              Senha atual
            </label>
            <input
              type="password"
              required
              placeholder="Senha atual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="argila-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={labelStyle}>
              Nova senha
            </label>
            <input
              type="password"
              required
              placeholder="Nova senha (mín. 6 caracteres)"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="argila-input"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={labelStyle}>
              Confirmar nova senha
            </label>
            <input
              type="password"
              required
              placeholder="Confirmar nova senha"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="argila-input"
            />
          </div>
          {passwordMsg && <MsgBox msg={passwordMsg} />}
          <button
            type="submit"
            disabled={passwordLoading}
            className="argila-btn argila-btn-primary self-start"
          >
            {passwordLoading ? "Alterando…" : "Alterar senha"}
          </button>
        </form>
      </section>}
    </div>
  );
}
