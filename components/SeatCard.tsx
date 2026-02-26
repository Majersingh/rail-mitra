import type { VacantBerth } from "@/lib/types";
import { BERTH_LABEL, CLASS_LABEL } from "@/lib/vacant-logic";

const CLASS_COLOR: Record<string, string> = {
  SL: "bg-blue-50 border-blue-200 text-blue-700",
  "3A": "bg-violet-50 border-violet-200 text-violet-700",
  "2A": "bg-amber-50 border-amber-200 text-amber-700",
  "1A": "bg-rose-50 border-rose-200 text-rose-700",
  "2S": "bg-green-50 border-green-200 text-green-700",
};

export default function SeatCard({ berth }: { berth: VacantBerth }) {
  const colorClass = CLASS_COLOR[berth.classCode] ?? "bg-neutral-50 border-neutral-200 text-neutral-700";

  return (
    <div className={`rounded-2xl border-2 p-4 flex flex-col gap-2 ${colorClass} hover:shadow-md transition-shadow`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-lg">{berth.coachName}</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/60">
            {CLASS_LABEL[berth.classCode] ?? berth.classCode}
          </span>
        </div>
        <span className="text-2xl font-black">#{berth.berthNo}</span>
      </div>

      {/* Berth Type */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">
          {BERTH_LABEL[berth.berthCode] ?? berth.berthCode} Berth
        </span>
        <span className="text-xs text-current/60">Cabin {berth.cabinCoupeNameNo}</span>
      </div>

      {/* Vacancy Window */}
      <div className="mt-1 pt-2 border-t border-current/10">
        <p className="text-xs font-medium opacity-70">Vacant window</p>
        <p className="text-sm font-bold">
          {berth.vacantFrom} → {berth.vacantTo}
        </p>
      </div>
    </div>
  );
}
