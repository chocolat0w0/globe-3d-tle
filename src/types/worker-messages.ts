import { FlatRings } from "./polygon";

export interface ComputeDayRequest {
  type: "compute-day";
  requestId: string;
  satelliteId: string;
  tle1: string;
  tle2: string;
  dayStartMs: number;
  durationMs: number;
  stepSec: number;
  outputs: { orbit: boolean; footprint: boolean; swath: boolean };
  footprintParams?: unknown;
  swathParams?: unknown;
}

export interface ComputeDayResponse {
  type: "computed-day";
  requestId: string;
  satelliteId: string;
  dayStartMs: number;
  stepSec: number;
  orbit?: {
    timesMs: ArrayBuffer;
    ecef: ArrayBuffer;
  };
  footprint?: {
    timesMs: ArrayBuffer;
    flat: FlatRings;
  };
  swath?: {
    flat: FlatRings;
  };
}

export interface WorkerError {
  type: "error";
  requestId: string;
  satelliteId: string;
  message: string;
}

export type WorkerMessage = ComputeDayRequest;
export type MainMessage = ComputeDayResponse | WorkerError;
