import { describe, expect, it } from "vitest";
import {
  computeAttentionFromRecentDiaryRows,
  resolveAttentionChangedAt,
} from "@/lib/attention/recompute-attention-trend";

describe("computeAttentionFromRecentDiaryRows", () => {
  it("uma falta isolada não força declining", () => {
    const r = computeAttentionFromRecentDiaryRows([
      { absent: true, attention_score: null },
      { absent: false, attention_score: 8 },
      { absent: false, attention_score: 7 },
      { absent: false, attention_score: 6 },
    ]);
    expect(r.attention_trend).not.toBe("declining");
    expect(r.consecutive_absences).toBe(1);
  });

  it("duas faltas consecutivas forçam declining com confiança 1", () => {
    const r = computeAttentionFromRecentDiaryRows([
      { absent: true, attention_score: null },
      { absent: true, attention_score: null },
      { absent: false, attention_score: 8 },
    ]);
    expect(r).toEqual({
      attention_trend: "declining",
      attention_confidence: 1,
      consecutive_absences: 2,
    });
  });

  it("menos de 3 presenças com score e sem dupla falta => insufficient_data", () => {
    const r = computeAttentionFromRecentDiaryRows([
      { absent: false, attention_score: 8 },
      { absent: false, attention_score: 7 },
    ]);
    expect(r.attention_trend).toBe("insufficient_data");
    expect(r.attention_confidence).toBe(0);
  });

  it("queda média >= 1.5 pontos => declining", () => {
    const r = computeAttentionFromRecentDiaryRows([
      { absent: false, attention_score: 6 },
      { absent: false, attention_score: 6 },
      { absent: false, attention_score: 8 },
      { absent: false, attention_score: 8 },
    ]);
    expect(r.attention_trend).toBe("declining");
    expect(r.attention_confidence).toBe(0.85);
  });

  it("alta média >= 1.5 pontos => improving", () => {
    const r = computeAttentionFromRecentDiaryRows([
      { absent: false, attention_score: 8 },
      { absent: false, attention_score: 8 },
      { absent: false, attention_score: 6 },
      { absent: false, attention_score: 6 },
    ]);
    expect(r.attention_trend).toBe("improving");
  });

  it("delta entre -1.5 e 1.5 => stable", () => {
    const r = computeAttentionFromRecentDiaryRows([
      { absent: false, attention_score: 7 },
      { absent: false, attention_score: 7 },
      { absent: false, attention_score: 7 },
      { absent: false, attention_score: 7 },
    ]);
    expect(r.attention_trend).toBe("stable");
  });
});

describe("resolveAttentionChangedAt", () => {
  it("mudança de trend grava novo timestamp", () => {
    expect(
      resolveAttentionChangedAt({
        oldTrend: "stable",
        newTrend: "declining",
        previousChangedAt: "2026-01-01T00:00:00.000Z",
        nowIso: "2026-04-15T12:00:00.000Z",
      })
    ).toBe("2026-04-15T12:00:00.000Z");
  });

  it("ausência de mudança preserva attention_changed_at", () => {
    expect(
      resolveAttentionChangedAt({
        oldTrend: "stable",
        newTrend: "stable",
        previousChangedAt: "2026-01-01T00:00:00.000Z",
        nowIso: "2026-04-15T12:00:00.000Z",
      })
    ).toBe("2026-01-01T00:00:00.000Z");
  });
});
