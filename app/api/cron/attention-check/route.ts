import { NextRequest, NextResponse } from "next/server";
import { recomputeAttentionTrendForStudent } from "@/lib/attention/recompute-attention-trend";
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
    await recomputeAttentionTrendForStudent(s.id, s.professor_id);
    n++;
  }
  return NextResponse.json({ ok: true, studentsProcessed: n });
}
