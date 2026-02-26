import type { Metadata } from "next";
import { Suspense } from "react";
import SeatsClient from "./SeatsClient";

export const metadata: Metadata = {
  title: "Vacant Seats — TrainSeat Finder",
};

/** 
 * A simple skeleton or spinner to show 
 * while the seat chart is being prepared.
 */
function SeatsLoading() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="grid grid-cols-4 gap-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
        ))}
      </div>
      <p className="text-center text-sm text-gray-400">Loading seat map...</p>
    </div>
  );
}

export default function SeatsPage() {
  return (
      <Suspense fallback={<SeatsLoading />}>
        <SeatsClient />
      </Suspense>
  );
}
