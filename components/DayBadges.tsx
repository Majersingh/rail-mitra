import type { TrainDetail, DayKey } from "@/lib/types";

const DAYS: { key: DayKey; label: string; field: keyof TrainDetail }[] = [
  { key: "Mon", label: "M", field: "trainRunsOnMon" },
  { key: "Tue", label: "T", field: "trainRunsOnTue" },
  { key: "Wed", label: "W", field: "trainRunsOnWed" },
  { key: "Thu", label: "T", field: "trainRunsOnThu" },
  { key: "Fri", label: "F", field: "trainRunsOnFri" },
  { key: "Sat", label: "S", field: "trainRunsOnSat" },
  { key: "Sun", label: "S", field: "trainRunsOnSun" },
];

export default function DayBadges({ detail }: { detail: TrainDetail }) {
  return (
    <div className="flex gap-1">
      {DAYS.map(({ key, label, field }) => {
        const runs = detail[field] === "Y";
        return (
          <span
            key={key}
            title={key}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${runs
                ? "bg-primary-500 text-white"
                : "bg-neutral-100 text-neutral-400"
              }`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
