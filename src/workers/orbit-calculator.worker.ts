/// <reference lib="webworker" />

import { computeOrbit } from "../lib/tle/orbit";
import { computeFootprints } from "../lib/tle/footprint";
import { computeSwath } from "../lib/tle/swath";
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
    footprintParams,
    swathParams,
  } = req;

  try {
    const totalStart = performance.now();

    const response: ComputeDayResponse = {
      type: "computed-day",
      requestId,
      satelliteId,
      dayStartMs,
      stepSec,
    };

    const transferables: ArrayBuffer[] = [];

    let orbitMs: number | undefined;
    if (outputs.orbit) {
      const t0 = performance.now();
      const orbitData = computeOrbit(tle1, tle2, dayStartMs, durationMs, stepSec);
      orbitMs = performance.now() - t0;
      const timesBuffer = orbitData.timesMs.buffer as ArrayBuffer;
      const ecefBuffer = orbitData.ecef.buffer as ArrayBuffer;
      response.orbit = { timesMs: timesBuffer, ecef: ecefBuffer };
      transferables.push(timesBuffer, ecefBuffer);
    }

    let footprintMs: number | undefined;
    if (outputs.footprint && footprintParams) {
      const t0 = performance.now();
      const fpData = computeFootprints(tle1, tle2, dayStartMs, durationMs, stepSec, footprintParams);
      footprintMs = performance.now() - t0;
      const timesBuffer = fpData.timesMs.buffer as ArrayBuffer;
      const ringsBuffer = fpData.rings.buffer as ArrayBuffer;
      const offsetsBuffer = fpData.offsets.buffer as ArrayBuffer;
      const countsBuffer = fpData.counts.buffer as ArrayBuffer;
      const timeSizesBuffer = fpData.timeSizes.buffer as ArrayBuffer;
      response.footprint = {
        timesMs: timesBuffer,
        flat: { rings: ringsBuffer, offsets: offsetsBuffer, counts: countsBuffer },
        timeSizes: timeSizesBuffer,
      };
      transferables.push(timesBuffer, ringsBuffer, offsetsBuffer, countsBuffer, timeSizesBuffer);
    }

    let swathMs: number | undefined;
    if (outputs.swath && swathParams) {
      const t0 = performance.now();
      const swathData = computeSwath(tle1, tle2, dayStartMs, durationMs, swathParams);
      swathMs = performance.now() - t0;
      const ringsBuffer = swathData.rings.buffer as ArrayBuffer;
      const offsetsBuffer = swathData.offsets.buffer as ArrayBuffer;
      const countsBuffer = swathData.counts.buffer as ArrayBuffer;
      response.swath = {
        flat: { rings: ringsBuffer, offsets: offsetsBuffer, counts: countsBuffer },
      };
      transferables.push(ringsBuffer, offsetsBuffer, countsBuffer);
    }

    response.timings = {
      orbitMs,
      footprintMs,
      swathMs,
      totalMs: performance.now() - totalStart,
    };

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
