"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Train, TrainDetail } from "@/lib/types";
import TrainCard from "@/components/TrainCard";
import Link from "next/link";
import { Search, X , ArrowLeft} from "lucide-react";
import { useRouter } from "next/navigation";

export default function TrainsResultsClient() {
  const router=useRouter()
  const sp = useSearchParams();
  const srcId   = sp.get("srcId")!;
  const destId  = sp.get("destId")!;
  const srcCode = sp.get("srcCode")!;
  const destCode = sp.get("destCode")!;
  const srcName = sp.get("srcName")!;
  const destName = sp.get("destName")!;
  const date    = sp.get("date")!;

  const [trains, setTrains]   = useState<Train[]>([]);
  const [details, setDetails] = useState<Record<string, TrainDetail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [query, setQuery]     = useState(""); // ← search state

  // ── Fetch all trains ──────────────────────────
  useEffect(() => {
    if (!srcId || !destId) return;
    setLoading(true);
    fetch(`/api/trains?srcId=${srcId}&destId=${destId}`)
      .then((r) => r.json())
      .then((data: Train[]) => {
        setTrains(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch trains. Try again.");
        setLoading(false);
      });
  }, [srcId, destId]);

  // ── Fetch train details in parallel (batched) ─
  const fetchDetails = useCallback(async (trainList: Train[]) => {
    for (let i = 0; i < trainList.length; i += 5) {
      const batch = trainList.slice(i, i + 5);
      await Promise.all(
        batch.map(async (train) => {
          try {
            const res = await fetch(
              `/api/train-detail?trainNo=${train.trainNo}&trainName=${encodeURIComponent(train.trainName)}`
            );
            const data: TrainDetail = await res.json();
            setDetails((prev) => ({ ...prev, [train.trainNo]: data }));
          } catch { /* silently skip */ }
        })
      );
    }
  }, []);

  useEffect(() => {
    if (trains.length > 0) fetchDetails(trains);
  }, [trains, fetchDetails]);

  // ── Filter trains by name or number ──────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return trains;
    return trains.filter(
      (t) =>
        t.trainNo.toLowerCase().includes(q) ||
        t.trainName.toLowerCase().includes(q)
    );
  }, [trains, query]);

  return (
    <main className="min-h-screen bg-neutral-50">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-neutral-100 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={()=>router.back()} className="cursor-pointer"> <ArrowLeft/></button>
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <span className="font-bold text-primary-700">{srcCode}</span>
            <span className="text-neutral-400">→</span>
            <span className="font-bold text-primary-700">{destCode}</span>
            <span className="text-neutral-400 ml-2">·</span>
            <span className="text-neutral-500">{date}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── Title ── */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-neutral-800">
            Trains:{" "}
            <span className="text-primary-600">{srcName}</span>{" "}
            <span className="text-neutral-400 font-normal">to</span>{" "}
            <span className="text-primary-600">{destName}</span>
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            {loading
              ? "Searching..."
              : query
              ? `${filtered.length} of ${trains.length} trains`
              : `${trains.length} trains found`}{" "}
            · Showing Sleeper &amp; AC coaches only
          </p>
        </div>

        {/* ── Search bar ── */}
        {!loading && trains.length > 0 && (
          <div className="relative mb-6">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              size={16}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by train name or number…"
              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-neutral-200
                         bg-white text-sm text-neutral-800 placeholder-neutral-400
                         focus:outline-none focus:ring-2 focus:ring-primary-500
                         focus:border-transparent shadow-sm"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400
                           hover:text-neutral-600 transition-colors"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* ── Train list ── */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-2xl bg-neutral-200 animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          // ── No results state ──
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-neutral-600 font-medium">
              No trains match &ldquo;{query}&rdquo;
            </p>
            <p className="text-neutral-400 text-sm mt-1">
              Try a different train name or number
            </p>
            <button
              onClick={() => setQuery("")}
              className="mt-4 text-primary-600 hover:text-primary-800 text-sm font-medium"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((train) => (
              <TrainCard
                key={train.trainNo}
                train={train}
                detail={details[train.trainNo] ?? null}
                date={date}
                fromCode={srcCode}
                toCode={destCode}
                fromName={srcName}
                toName={destName}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
