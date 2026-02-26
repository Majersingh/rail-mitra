import type { Metadata } from "next";
import SeatsClient from "./SeatsClient";

export const metadata: Metadata = {
  title: "Vacant Seats — TrainSeat Finder",
};

export default function SeatsPage() {
  return <SeatsClient />;
}
