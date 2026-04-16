import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/ai/run-report-job", () => ({
  pickPendingReportJob: vi.fn(),
  processOneReportJob: vi.fn(),
}));

vi.mock("@/lib/attention/recompute-attention-trend", () => ({
  recomputeAttentionTrendForStudent: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import {
  pickPendingReportJob,
  processOneReportJob,
} from "@/lib/ai/run-report-job";
import { recomputeAttentionTrendForStudent } from "@/lib/attention/recompute-attention-trend";
import { createAdminClient } from "@/lib/supabase/admin";
import { GET as processAiJobsGET } from "@/app/api/cron/process-ai-jobs/route";
import { GET as attentionCheckGET } from "@/app/api/cron/attention-check/route";

describe("AI routes end-to-end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "cron-secret");
  });

  it("process-ai-jobs retorna 401 sem o header correto", async () => {
    const req = new NextRequest("http://localhost/api/cron/process-ai-jobs");

    const res = await processAiJobsGET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("process-ai-jobs drena os jobs pendentes e retorna a quantidade processada", async () => {
    vi.mocked(pickPendingReportJob)
      .mockResolvedValueOnce("job-1")
      .mockResolvedValueOnce("job-2")
      .mockResolvedValueOnce(null);
    vi.mocked(processOneReportJob).mockResolvedValue(true);

    const req = new NextRequest("http://localhost/api/cron/process-ai-jobs", {
      headers: { authorization: "Bearer cron-secret" },
    });

    const res = await processAiJobsGET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, processed: 2 });
    expect(processOneReportJob).toHaveBeenCalledTimes(2);
  });

  it("attention-check retorna 401 sem o header correto", async () => {
    const req = new NextRequest("http://localhost/api/cron/attention-check");

    const res = await attentionCheckGET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: "unauthorized" });
  });

  it("attention-check percorre todos os alunos e chama o worker", async () => {
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: [
            { id: "student-1", professor_id: "prof-1" },
            { id: "student-2", professor_id: "prof-1" },
          ],
        }),
      })),
    } as never);

    const req = new NextRequest("http://localhost/api/cron/attention-check", {
      headers: { authorization: "Bearer cron-secret" },
    });

    const res = await attentionCheckGET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, studentsProcessed: 2 });
    expect(recomputeAttentionTrendForStudent).toHaveBeenCalledTimes(2);
  });
});
