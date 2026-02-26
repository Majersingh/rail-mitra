import type { Metadata } from "next";
import { Suspense } from "react";
import TrainsResultsClient from "./TrainsResultsClient";

export const metadata: Metadata = {
  title: "Trains Between Stations — TrainSeat Finder",
  description: "All trains running between your selected stations with real-time schedule.",
};

// Create a simple Loading UI for the skeleton
function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p className="text-gray-500">Searching for available trains...</p>
    </div>
  );
}

export default function ResultsPage() {
  return (
      <Suspense fallback={<LoadingSkeleton />}>
        <TrainsResultsClient />
      </Suspense>
  );
}
