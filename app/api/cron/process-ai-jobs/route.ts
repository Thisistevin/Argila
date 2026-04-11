import { NextRequest, NextResponse } from "next/server";
import {
  pickPendingReportJob,
  processOneReportJob,
} from "@/lib/ai/run-report-job";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let processed = 0;
  for (let i = 0; i < 10; i++) {
    const id = await pickPendingReportJob();
    if (!id) break;
    const ok = await processOneReportJob(id);
    if (ok) processed++;
  }
  return NextResponse.json({ ok: true, processed });
}
