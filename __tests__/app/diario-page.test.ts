import { describe, expect, it, vi } from "vitest";
import { getWeeklyActivityForProfessor } from "@/lib/diario/get-weekly-activity";

describe("getWeeklyActivityForProfessor (diário)", () => {
  it("retorna 7 pontos para o gráfico semanal", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "diaries") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          };
        }
        if (table === "reports") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  gte: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected ${table}`);
      }),
    };

    const points = await getWeeklyActivityForProfessor(
      supabase as never,
      "prof-1"
    );
    expect(points).toHaveLength(7);
    expect(points[0]).toMatchObject({
      dayLabel: expect.any(String),
      diaries: expect.any(Number),
      reports: expect.any(Number),
    });
  });
});
