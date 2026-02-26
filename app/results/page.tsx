import type { Metadata } from "next";
import TrainsResultsClient from "./TrainsResultsClient";

export const metadata: Metadata = {
  title: "Trains Between Stations — TrainSeat Finder",
  description: "All trains running between your selected stations with real-time schedule.",
};

export default function ResultsPage() {
  return <TrainsResultsClient />;
}
