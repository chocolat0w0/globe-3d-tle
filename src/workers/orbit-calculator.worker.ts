/// <reference lib="webworker" />

import { computeOrbit } from "../lib/tle/orbit";
import type {
  ComputeDayRequest,
  ComputeDayResponse,
  WorkerError,
} from "../types/worker-messages";

self.onmessage = (event: MessageEvent<ComputeDayRequest>) => {
  const req = event.data;
  const {
    requestId,
    satelliteId,
    tle1,
    tle2,
    dayStartMs,
    durationMs,
    stepSec,
    outputs,
  } = req;

  try {
    const response: ComputeDayResponse = {
      type: "computed-day",
      requestId,
      satelliteId,
      dayStartMs,
      stepSec,
    };

    const transferables: ArrayBuffer[] = [];

    if (outputs.orbit) {
      const orbitData = computeOrbit(tle1, tle2, dayStartMs, durationMs, stepSec);
      const timesBuffer = orbitData.timesMs.buffer as ArrayBuffer;
      const ecefBuffer = orbitData.ecef.buffer as ArrayBuffer;
      response.orbit = { timesMs: timesBuffer, ecef: ecefBuffer };
      transferables.push(timesBuffer, ecefBuffer);
    }

    self.postMessage(response, transferables);
  } catch (e) {
    const error: WorkerError = {
      type: "error",
      requestId,
      satelliteId,
      message: e instanceof Error ? e.message : String(e),
    };
    self.postMessage(error);
  }
};
