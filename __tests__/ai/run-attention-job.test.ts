import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/attention/recompute-attention-trend", () => ({
  recomputeAttentionTrendForStudent: vi.fn().mockResolvedValue(undefined),
}));

import { recomputeAttentionTrendForStudent } from "@/lib/attention/recompute-attention-trend";
import { runAttentionForStudent } from "@/lib/ai/run-attention-job";

describe("lib/ai/run-attention-job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delega para recomputeAttentionTrendForStudent", async () => {
    await runAttentionForStudent("student-1", "prof-1");
    expect(recomputeAttentionTrendForStudent).toHaveBeenCalledWith(
      "student-1",
      "prof-1"
    );
  });
});
