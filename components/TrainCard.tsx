"use client";

import type { Train, TrainDetail } from "@/lib/types";
import DayBadges from "./DayBadges";
import Link from "next/link";

interface Props {
  train: Train;
  detail: TrainDetail | null;
  date: string;
  fromCode: string;
  toCode: string;
  fromName: string;
  toName: string;
}

function doesTrainRunOn(detail: TrainDetail, dateStr: string): boolean {
//  console.log(detail)
  const day = new Date(dateStr).getDay(); // 0=Sun
  const map: (keyof TrainDetail)[] = [
    "trainRunsOnSun", "trainRunsOnMon", "trainRunsOnTue",
    "trainRunsOnWed", "trainRunsOnThu", "trainRunsOnFri", "trainRunsOnSat",
  ];
  return detail[map[day]] === "Y";
}

export default function TrainCard({
  train, detail, date, fromCode, toCode, fromName, toName,
}: Props) {
  const runs = detail ? doesTrainRunOn(detail, date) : null;

  const params = new URLSearchParams({
    date, fromCode, toCode, fromName, toName,
    trainName: train.trainName,
    trainSrcstncode: detail?.stationFrom!

  });

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 hover:shadow-lg 
                    hover:border-primary-200 transition-all group">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Train Info */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-primary-600 bg-primary-50 
                             px-2 py-0.5 rounded-lg">
              {train.trainNo}
            </span>
            <h3 className="font-bold text-neutral-800 text-base leading-tight">
              {train.trainName}
            </h3>
          </div>
          <p className="text-xs text-neutral-500 font-medium">
            {train.trainType}
          </p>
        </div>

        {/* Times */}
        <div className="flex items-center gap-3 text-sm">
          <div className="text-center">
            <p className="font-bold text-neutral-800">{train.dep}</p>
            <p className="text-xs text-neutral-400">{train.from}</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-px bg-neutral-300 relative">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-neutral-400 text-base">
                →
              </span>
            </div>
          </div>
          <div className="text-center">
            <p className="font-bold text-neutral-800">{train.arr}</p>
            <p className="text-xs text-neutral-400">{train.to}</p>
          </div>
        </div>
      </div>

      {/* Run Days + Status */}
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {detail ? (
            <>
              <DayBadges detail={detail} />
              {runs !== null && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    runs
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {runs ? "Runs on selected date" : "Does NOT run on this date"}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-neutral-400 animate-pulse">
              Loading schedule...
            </span>
          )}
        </div>

        {runs && (
          <Link
            href={`/seats/${train.trainNo}?${params.toString()}`}
            className="px-5 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl 
                       text-sm font-semibold transition-colors"
          >
            Find Vacant Seats →
          </Link>
        )}
      </div>
    </div>
  );
}
