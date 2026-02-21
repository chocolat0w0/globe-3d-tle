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

    if (outputs.footprint && footprintParams) {
      const fpData = computeFootprints(tle1, tle2, dayStartMs, durationMs, stepSec, footprintParams);
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

    if (outputs.swath && swathParams) {
      const swathData = computeSwath(tle1, tle2, dayStartMs, durationMs, swathParams);
      const ringsBuffer = swathData.rings.buffer as ArrayBuffer;
      const offsetsBuffer = swathData.offsets.buffer as ArrayBuffer;
      const countsBuffer = swathData.counts.buffer as ArrayBuffer;
      response.swath = {
        flat: { rings: ringsBuffer, offsets: offsetsBuffer, counts: countsBuffer },
      };
      transferables.push(ringsBuffer, offsetsBuffer, countsBuffer);
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
