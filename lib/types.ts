export interface Station {
  id: string;
  code: string;
  name: string;
  displayName: string; // "CODE/Full Name"
}

export interface Train {
  trainNo: string;
  trainName: string;
  trainType: string;
  from: string;
  to: string;
  dep: string;
  arr: string;
}

export interface StationStop {
  stationCode: string;
  stationName: string;
  arrivalTime: string;
  departureTime: string;
  distance: string;
  dayCount: string;
  stnSerialNumber: string;
}

export interface TrainDetail {
  trainNumber: string;
  trainName: string;
  trainRunsOnMon: string;
  trainRunsOnTue: string;
  trainRunsOnWed: string;
  trainRunsOnThu: string;
  trainRunsOnFri: string;
  trainRunsOnSat: string;
  trainRunsOnSun: string;
  stationList: StationStop[];
}

export interface CoachSummary {
  coachName: string;
  classCode: "SL" | "2A" | "3A" | "1A" | "2S" | string;
  vacantBerths: number;
}

export interface BerthSplit {
  splitNo: number;
  from: string;
  to: string;
  quota: string;
  occupancy: boolean;
}

export interface Berth {
  cabinCoupeNameNo: string;
  berthCode: string; // L=Lower, M=Middle, U=Upper, R=Side Lower, P=Side Upper
  berthNo: number;
  from: string;
  to: string;
  bsd: BerthSplit[];
  enable: boolean;
}

export interface VacantBerth extends Berth {
  coachName: string;
  classCode: string;
  vacantFrom: string;
  vacantTo: string;
}

export type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
