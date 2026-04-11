"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ALLOWED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "audio/mpeg",
  "video/mp4",
];

export function FileUpload({
  userId,
  onUploaded,
}: {
  userId: string;
  onUploaded: (path: string, contentType: string) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      setStatus("Tipo não permitido");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus("Máximo 10 MB");
      return;
    }
    setStatus("Enviando…");
    const supabase = createClient();
    const path = `${userId}/${crypto.randomUUID()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage
      .from("diary-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setStatus(error.message);
      return;
    }
    onUploaded(path, file.type);
    setStatus("Anexo enviado");
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium" style={{ color: "var(--color-text-sec)" }}>
        Anexo opcional (PDF, imagem, áudio, vídeo)
      </label>
      <input type="file" accept={ALLOWED.join(",")} onChange={onChange} className="text-sm" />
      {status && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {status}
        </p>
      )}
    </div>
  );
}
