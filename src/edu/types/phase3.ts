export type EduMode = "observe" | "launch" | "compare" | "mission";

export type Phase3Weather = "clear" | "cloudy";

export interface Phase3CompareState {
  resolutionSatelliteId: string;
  opticalSatelliteId: string;
  sarSatelliteId: string;
  weather: Phase3Weather;
}
