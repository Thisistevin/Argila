import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/entitlement", () => ({
  getActiveSubscription: vi.fn(),
  canUseJourneys: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canUseJourneys, getActiveSubscription } from "@/lib/entitlement";
import {
  acceptAiSuggestion,
  assignJourneyToStudent,
  setStudentMilestone,
} from "@/actions/journeys";

const PROF = "aaaaaaaa-0000-4000-8000-000000000001";
const STUDENT = "bbbbbbbb-0000-4000-8000-000000000002";
const JOURNEY_A = "cccccccc-0000-4000-8000-000000000003";
const JOURNEY_B = "dddddddd-0000-4000-8000-000000000004";
const MS_A2 = "ffffffff-0000-4000-8000-000000000006";
const MS_B1 = "99999999-0000-4000-8000-000000000007";

function chainMaybeSingle(data: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data }),
        }),
      }),
    }),
  };
}

function mockUpdateChain() {
  const eqJourney = vi.fn().mockResolvedValue({ error: null });
  const eqStudent = vi.fn().mockReturnValue({ eq: eqJourney });
  const update = vi.fn().mockReturnValue({ eq: eqStudent });
  return update;
}

describe("actions/journeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveSubscription).mockResolvedValue({
      plan: "professor",
      billing_cycle: "monthly",
      status: "active",
      period_end: new Date(Date.now() + 86400000).toISOString(),
      source: "asaas",
    });
    vi.mocked(canUseJourneys).mockReturnValue(true);
  });

  it("assignJourneyToStudent faz upsert quando aluno e jornada pertencem ao professor", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === "students") return chainMaybeSingle({ id: STUDENT });
      if (table === "journeys") return chainMaybeSingle({ id: JOURNEY_A });
      if (table === "student_journeys") return { upsert };
      throw new Error(table);
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROF } } }),
      },
      from,
    } as never);

    const fd = new FormData();
    fd.set("student_id", STUDENT);
    fd.set("journey_id", JOURNEY_A);
    await assignJourneyToStudent(fd);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: STUDENT,
        journey_id: JOURNEY_A,
        current_milestone_id: null,
      }),
      { onConflict: "student_id,journey_id" }
    );
    expect(revalidatePath).toHaveBeenCalledWith("/galeria");
  });

  it("acceptAiSuggestion copia só o marco sugerido da jornada informada", async () => {
    const update = mockUpdateChain();
    const from = vi.fn((table: string) => {
      if (table === "students") return chainMaybeSingle({ id: STUDENT });
      if (table === "journeys") return chainMaybeSingle({ id: JOURNEY_A });
      if (table === "milestones") return chainMaybeSingle({ id: MS_A2 });
      if (table === "student_journeys") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { ai_suggested_milestone_id: MS_A2 },
                }),
              }),
            }),
          }),
          update,
        };
      }
      throw new Error(table);
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROF } } }),
      },
      from,
    } as never);

    const fd = new FormData();
    fd.set("student_id", STUDENT);
    fd.set("journey_id", JOURNEY_A);
    await acceptAiSuggestion(fd);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        current_milestone_id: MS_A2,
        ai_suggested_milestone_id: null,
        ai_suggestion_note: null,
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith(`/aluno/${STUDENT}`);
  });

  it("setStudentMilestone grava marco quando pertence à jornada", async () => {
    const update = mockUpdateChain();
    const from = vi.fn((table: string) => {
      if (table === "students") return chainMaybeSingle({ id: STUDENT });
      if (table === "journeys") return chainMaybeSingle({ id: JOURNEY_B });
      if (table === "milestones") return chainMaybeSingle({ id: MS_B1 });
      if (table === "student_journeys") return { update };
      throw new Error(table);
    });

    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: PROF } } }),
      },
      from,
    } as never);

    const fd = new FormData();
    fd.set("student_id", STUDENT);
    fd.set("journey_id", JOURNEY_B);
    fd.set("milestone_id", MS_B1);
    await setStudentMilestone(fd);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ current_milestone_id: MS_B1 })
    );
  });
});
