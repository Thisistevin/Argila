import { Route } from "lucide-react";

export function JourneyBadge({
  milestoneName,
  journeyName,
}: {
  milestoneName: string | null;
  journeyName: string | null;
}) {
  const label =
    milestoneName && journeyName
      ? `${journeyName}: ${milestoneName}`
      : journeyName ?? milestoneName ?? "";
  if (!label) return null;

  return (
    <span
      className="inline-flex max-w-full min-w-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{
        background: "rgba(125,99,175,0.10)",
        color: "var(--argila-purple)",
        border: "1px solid rgba(125,99,175,0.22)",
      }}
      title={label}
    >
      <Route size={10} className="shrink-0" />
      <span
        className="min-w-0 truncate"
        style={{ display: "block" }}
      >
        {label}
      </span>
    </span>
  );
}
