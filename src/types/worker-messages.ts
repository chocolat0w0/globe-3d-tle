import { FlatRings } from "./polygon";
import type { FootprintParams } from "../lib/tle/footprint";
import type { SwathParams } from "../lib/tle/swath";

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
  footprintParams?: FootprintParams;
  swathParams?: SwathParams;
}

export interface ComputeTimings {
  orbitMs?: number;
  footprintMs?: number;
  swathMs?: number;
  totalMs: number;
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
    timeSizes: ArrayBuffer; // Int32Array: 各タイムステップのポリゴン数
  };
  swath?: {
    flat: FlatRings;
  };
  timings?: ComputeTimings;
}

export interface WorkerError {
  type: "error";
  requestId: string;
  satelliteId: string;
  message: string;
}

export type WorkerMessage = ComputeDayRequest;
export type MainMessage = ComputeDayResponse | WorkerError;
