import { NextRequest, NextResponse } from "next/server";
import { runAttentionForStudent } from "@/lib/ai/run-attention-job";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data: students } = await admin.from("students").select("id, professor_id");
  let n = 0;
  for (const s of students ?? []) {
    await runAttentionForStudent(s.id, s.professor_id);
    n++;
  }
  return NextResponse.json({ ok: true, studentsProcessed: n });
}
