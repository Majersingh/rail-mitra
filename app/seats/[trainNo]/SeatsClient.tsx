"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useParams } from "next/navigation";
import type { CoachSummary, VacantBerth, TrainDetail, StationStop } from "@/lib/types";
import { useRouter } from "next/navigation";
import {
  buildStationIndex,
  isBerthVacantForJourney,
  getVacantWindowForJourney,
  CLASS_LABEL,
} from "@/lib/vacant-logic";
import SeatCard from "@/components/SeatCard";
import { ArrowLeft } from "lucide-react";

const TARGET_CLASSES = new Set(["SL", "2A", "3A", "1A", "2S"]);

type GroupedVacant = Record<string, VacantBerth[]>; // coachName → berths

export default function SeatsClient() {
  const { trainNo } = useParams<{ trainNo: string }>();
  const router=useRouter();
  const sp = useSearchParams();
  const date = sp.get("date")!;
  const fromCode = sp.get("fromCode")!;
  const toCode = sp.get("toCode")!;
  const fromName = sp.get("fromName")!;
  const toName = sp.get("toName")!;
  const trainName = sp.get("trainName")!;
  const trainSrcstncode = sp.get("trainSrcstncode");

  const [coaches, setCoaches] = useState<CoachSummary[]>([]);
  const [vacantByCoach, setVacantByCoach] = useState<GroupedVacant>({});
  const [stops, setStops] = useState<StationStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [filterClass, setFilterClass] = useState<string>("ALL");
  const [error, setError] = useState("");

  // Step 1: Fetch train detail (for station list) + train composition
  const init = useCallback(async () => {
    try {
      setLoading(true);

      const [detailRes, compRes] = await Promise.all([
        fetch(`/api/train-detail?trainNo=${trainNo}&trainName=${encodeURIComponent(trainName)}`),
        fetch("/api/train-composition", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ trainNo, jDate: date, boardingStation: fromCode }),
        }),
      ]);

      const detail: TrainDetail = await detailRes.json();
      const comp = await compRes.json();

      if (!detail.stationList || !comp.cdd) {
        setError("Could not load train data. Chart may not be prepared yet.");
        setLoading(false);
        return;
      }

      setStops(detail.stationList);

      // Filter only SL + AC coaches with possibly vacant berths
      const targetCoaches: CoachSummary[] = (comp.cdd as CoachSummary[]).filter(
        (c) => TARGET_CLASSES.has(c.classCode)
      );
      setCoaches(targetCoaches);
      setProgress({ done: 0, total: targetCoaches.length });

      // Step 2: Fetch coach composition in parallel (batches of 6)
      const stationIndex = buildStationIndex(detail.stationList);
      const grouped: GroupedVacant = {};

      for (let i = 0; i < targetCoaches.length; i += 6) {
        const batch = targetCoaches.slice(i, i + 6);
        await Promise.all(
          batch.map(async (coach) => {
            try {
              const res = await fetch("/api/coach-composition", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  trainNo,
                  boardingStation: fromCode,
                  toStation: toCode,
                  trainSourceStation: trainSrcstncode,
                  jDate: date,
                  coach: coach.coachName,
                  cls: coach.classCode,
                }),
              });

              const data = await res.json();
              if (!data.bdd) return;

              const vacantBerths: VacantBerth[] = [];
              
              for (const berth of data.bdd) {
                console.log( isBerthVacantForJourney(berth, fromCode, toCode, stationIndex))
                if (
                  isBerthVacantForJourney(berth, fromCode, toCode, stationIndex)
                ) {
                  const window = getVacantWindowForJourney(
                    berth, fromCode, toCode, stationIndex, detail.stationList
                  );
                  vacantBerths.push({
                    ...berth,
                    coachName: coach.coachName,
                    classCode: coach.classCode,
                    vacantFrom: window?.from ?? fromCode,
                    vacantTo: window?.to ?? toCode,
                  });
                }
              }

              if (vacantBerths.length > 0) {
                grouped[coach.coachName] = vacantBerths;
              }
            } catch {
              // skip failed coaches
            } finally {
              setProgress((p) => ({ ...p, done: p.done + 1 }));
            }
          })
        );
      }

      setVacantByCoach(grouped);
      setLoading(false);
    } catch (e) {
      setError("Something went wrong loading seat data.");
      setLoading(false);
    }
  }, [trainNo, date, fromCode, toCode, trainName, trainSrcstncode]);

  useEffect(() => { init(); }, [init]);

  // Build flat list for display
  const allVacant = Object.values(vacantByCoach).flat();
  const filtered =
    filterClass === "ALL"
      ? allVacant
      : allVacant.filter((b) => b.classCode === filterClass);

  const availableClasses = [...new Set(allVacant.map((b) => b.classCode))];

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-neutral-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4 flex-wrap">
          <button onClick={()=>router.back()} className="cursor-pointer"> <ArrowLeft/></button>
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 flex-1 min-w-0">
            <span className="font-mono font-bold text-primary-700 shrink-0">{trainNo}</span>
            <span className="truncate font-bold">{trainName}</span>
            <span className="text-neutral-400 shrink-0">·</span>
            <span className="text-primary-600 shrink-0 font-bold">{fromCode}</span>
            <span className="text-neutral-400 shrink-0">→</span>
            <span className="text-primary-600 shrink-0 font-bold">{toCode}</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Summary */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-800 mb-1">
            Vacant Seats for Your Journey
          </h1>
          <p className="text-neutral-500 text-sm">
            <span className="font-semibold">{fromName}</span> → <span className="font-semibold">{toName}</span>
            {" "} · {date}
          </p>
        </div>

        {/* Loading progress */}
        {loading && (
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-neutral-700">
                Scanning coaches...
              </span>
              <span className="text-sm text-neutral-500">
                {progress.done} / {progress.total}
              </span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                style={{
                  width: progress.total > 0
                    ? `${(progress.done / progress.total) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              Fetching berth-level occupancy from IRCTC charts...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        {!loading && allVacant.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-sm font-semibold text-neutral-600 mr-1">Filter:</span>
            {["ALL", ...availableClasses].map((cls) => (
              <button
                key={cls}
                onClick={() => setFilterClass(cls)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors
                  ${filterClass === cls
                    ? "bg-primary-500 border-primary-500 text-white"
                    : "bg-white border-neutral-200 text-neutral-600 hover:border-primary-300"
                  }`}
              >
                {cls === "ALL" ? `All (${allVacant.length})` : `${CLASS_LABEL[cls] ?? cls} (${allVacant.filter(b => b.classCode === cls).length})`}
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && allVacant.length === 0 && !error && (
          <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200">
            <span className="text-5xl mb-4 block">😔</span>
            <h2 className="text-xl font-bold text-neutral-700 mb-2">No Vacant Seats Found</h2>
            <p className="text-neutral-500 text-sm">
              All berths for your journey segment ({fromCode} → {toCode}) are occupied.
            </p>
          </div>
        )}

        {/* Seat cards grouped by coach */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-8">
            {Object.entries(
              filtered.reduce<GroupedVacant>((acc, b) => {
                if (!acc[b.coachName]) acc[b.coachName] = [];
                acc[b.coachName].push(b);
                return acc;
              }, {})
            ).map(([coachName, berths]) => (
              <div key={coachName}>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-lg font-bold text-neutral-800">{coachName}</h2>
                  <span className="text-sm text-neutral-500">
                    {CLASS_LABEL[berths[0].classCode] ?? berths[0].classCode}
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    {berths.length} vacant
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {berths.map((berth) => (
                    <SeatCard key={`${coachName}-${berth.berthNo}`} berth={berth} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
