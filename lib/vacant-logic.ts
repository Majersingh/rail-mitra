import type { Berth, StationStop, VacantBerth } from "./types";

/**
 * Build an ordered index: stationCode → serial number
 */
export function buildStationIndex(stops: StationStop[]): Map<string, number> {
 
  const map = new Map<string, number>();
  stops.forEach((s) => map.set(s.stationCode, parseInt(s.stnSerialNumber)));
  return map;
}

/**
 * Check if a berth is vacant for the user's journey [boardStn → alightStn].
 *
 * Logic: A berth is usable if there exists NO occupied split whose
 * station range overlaps with [boardStn, alightStn].
 *
 * Overlap condition:
 *   occupied.from < user.alight  AND  occupied.to > user.board
 *
 * We also handle the "early vacancy" case:
 *   - If vacant segment starts BEFORE user.board → still valid
 *   - If vacant segment ends AFTER user.alight → still valid
 *   (because the berth is free during user's window)
 */
export function isBerthVacantForJourney(
  berth: Berth,
  userBoardCode: string,
  userAlightCode: string,
  stationIndex: Map<string, number>
): boolean {
  // if (!berth.enable) return false; tis mean this seat can not be booked that whyfoor now its dsabled
  const uBoard = stationIndex.get(userBoardCode) ?? -1;
  const uAlight = stationIndex.get(userAlightCode) ?? -1;
  if (uBoard === -1 || uAlight === -1) return false;

  for (const split of berth.bsd) {
    if (!split.occupancy) continue;

    const sFrom = stationIndex.get(split.from) ?? -1;
    const sTo = stationIndex.get(split.to) ?? -1;
    if (sFrom === -1 || sTo === -1) continue;

    // Check overlap: occupied segment overlaps user window
    const overlaps = sFrom < uAlight && sTo > uBoard;
    if (overlaps) return false;
  }

  return true;
}

/**
 * Find the exact vacant window for a berth within the user's journey range
 */
export function getVacantWindowForJourney(
  berth: Berth,
  userBoardCode: string,
  userAlightCode: string,
  stationIndex: Map<string, number>,
  stops: StationStop[]
): { from: string; to: string } | null {
  const uBoard = stationIndex.get(userBoardCode) ?? -1;
  const uAlight = stationIndex.get(userAlightCode) ?? -1;

  const stationBySerial = new Map<number, string>();
  stops.forEach((s) =>
    stationBySerial.set(parseInt(s.stnSerialNumber), s.stationCode)
  );

  // Find the widest contiguous vacant window covering [uBoard, uAlight]
  let vacantStart = uBoard;
  let vacantEnd = uAlight;

  for (const split of berth.bsd) {
    if (split.occupancy) continue;
    const sFrom = stationIndex.get(split.from) ?? -1;
    const sTo = stationIndex.get(split.to) ?? -1;
    if (sFrom <= uBoard && sTo >= uAlight) {
      vacantStart = sFrom;
      vacantEnd = sTo;
      break;
    }
  }

  return {
    from: stationBySerial.get(vacantStart) ?? userBoardCode,
    to: stationBySerial.get(vacantEnd) ?? userAlightCode,
  };
}

export const BERTH_LABEL: Record<string, string> = {
  L: "Lower",
  M: "Middle",
  U: "Upper",
  R: "Side Lower",
  P: "Side Upper",
};

export const CLASS_LABEL: Record<string, string> = {
  SL: "Sleeper",
  "2A": "2nd AC",
  "3A": "3rd AC",
  "1A": "1st AC",
  "2S": "2nd Seater",
  CC: "Chair Car",
};
