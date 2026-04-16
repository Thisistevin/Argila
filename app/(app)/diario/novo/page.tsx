import { redirect } from "next/navigation";
import { DiaryFlow } from "@/components/diary/DiaryFlow";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveSubscription,
  isProfessorPremium,
} from "@/lib/entitlement";

export default async function NovoDiarioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sub = await getActiveSubscription(supabase, user.id);
  const premium = isProfessorPremium(sub);

  const { data: students } = await supabase
    .from("students")
    .select("id, name, class_id")
    .eq("professor_id", user.id)
    .order("name");

  const { data: classes } = premium
    ? await supabase
        .from("classes")
        .select("id, name")
        .eq("professor_id", user.id)
        .order("name")
    : { data: [] };

  return (
    <div>
      <h1
        className="text-xl font-bold mb-6"
        style={{ color: "var(--argila-darkest)" }}
      >
        Novo diário
      </h1>
      <DiaryFlow
        userId={user.id}
        students={students ?? []}
        premium={premium}
        classes={classes ?? []}
      />
    </div>
  );
}
