"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StationInput from "./StationInput";
import type { Station } from "@/lib/types";

export default function HeroSearch() {
  const router = useRouter();
  const [from, setFrom] = useState<Station | null>(null);
  const [to, setTo] = useState<Station | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");

  const handleSearch = () => {
    if (!from || !to) {
      setError("Please select both From and To stations.");
      return;
    }
    if (from.id === to.id) {
      setError("From and To stations cannot be the same.");
      return;
    }
    setError("");

    const params = new URLSearchParams({
      srcId: from.id,
      destId: to.id,
      srcCode: from.code,
      destCode: to.code,
      srcName: from.name,
      destName: to.name,
      date,
    });
    router.push(`/results?${params.toString()}`);
  };

  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date(Date.now() + 120 * 86400000).toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl border border-neutral-100 p-6 md:p-8">
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <StationInput
          label="From Station"
          placeholder="e.g. Kalyan, CSMT, Mumbai"
          value={from}
          onChange={setFrom}
        />
        <StationInput
          label="To Station"
          placeholder="e.g. Nashik, Pune, Nagpur"
          value={to}
          onChange={setTo}
        />
      </div>

      <div className="flex flex-col gap-1 mb-4">
        <label className="text-sm font-semibold text-neutral-600">Travel Date</label>
        <input
          type="date"
          value={date}
          min={today}
          max={maxDate}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-3 rounded-xl border-2 border-neutral-200 focus:border-primary-500 
                     focus:outline-none transition-colors text-neutral-800 text-sm font-medium"
        />
      </div>

      {error && (
        <p className="text-sm text-error font-medium mb-3">{error}</p>
      )}

      <button
        onClick={handleSearch}
        className="w-full py-4 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 
                   text-white font-bold text-base rounded-xl transition-colors 
                   flex items-center justify-center gap-2"
      >
        <span>🔍</span>
        Search Vacant Seats
      </button>
    </div>
  );
}
