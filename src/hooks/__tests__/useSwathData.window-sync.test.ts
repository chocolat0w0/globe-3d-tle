import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useSwathData, swathCache } from "../useSwathData";
import type { SwathData } from "../../types/orbit";
import type { SwathParams } from "../../lib/tle/swath";
import type { ComputeDayRequest } from "../../types/worker-messages";

const postMessageMock = vi.fn();

vi.mock("../useWorker", () => ({
  useOrbitWorker: () => ({ postMessage: postMessageMock }),
}));

const WINDOW_MS = 4 * 3600 * 1000;
const BASE_START_MS = Date.UTC(2026, 1, 23, 8, 0, 0);
const ISS_TLE1 = "1 25544U 98067A   24001.50000000  .00020137  00000-0  36371-3 0  9993";
const ISS_TLE2 = "2 25544  51.6400 337.6580 0001584  86.9974 273.1408 15.50008824429730";
const SWATH_PARAMS: SwathParams = {
  offnadirRanges: [[-30, 30]],
  split: 360,
};

function extractRequests(): ComputeDayRequest[] {
  return postMessageMock.mock.calls.map(([request]) => request as ComputeDayRequest);
}

describe("useSwathData window sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swathCache.clear();
  });

  it("dayStartMs 指定時、メインリクエスト durationMs は4時間窓になる", async () => {
    renderHook(() =>
      useSwathData({
        satelliteId: "iss",
        tle1: ISS_TLE1,
        tle2: ISS_TLE2,
        swathParams: SWATH_PARAMS,
        dayStartMs: BASE_START_MS,
      }),
    );

    await waitFor(() => expect(postMessageMock).toHaveBeenCalled());

    const mainRequest = extractRequests().find((request) => request.dayStartMs === BASE_START_MS);
    expect(mainRequest).toBeDefined();
    expect(mainRequest?.durationMs).toBe(WINDOW_MS);
  });

  it("先読みリクエストは前後4時間窓（±WINDOW_MS）を送信する", async () => {
    renderHook(() =>
      useSwathData({
        satelliteId: "iss",
        tle1: ISS_TLE1,
        tle2: ISS_TLE2,
        swathParams: SWATH_PARAMS,
        dayStartMs: BASE_START_MS,
      }),
    );

    await waitFor(() => expect(postMessageMock).toHaveBeenCalledTimes(3));

    const prefetchStarts = extractRequests()
      .map((request) => request.dayStartMs)
      .filter((dayStartMs) => dayStartMs !== BASE_START_MS)
      .sort((a, b) => a - b);

    expect(prefetchStarts).toEqual([BASE_START_MS - WINDOW_MS, BASE_START_MS + WINDOW_MS]);
  });

  it("dayStartMs 未指定時、Date.now() を4時間窓に丸めた開始時刻を使う", async () => {
    const nowMs = Date.UTC(2026, 1, 23, 10, 30, 15);
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(nowMs);

    renderHook(() =>
      useSwathData({
        satelliteId: "iss",
        tle1: ISS_TLE1,
        tle2: ISS_TLE2,
        swathParams: SWATH_PARAMS,
      }),
    );

    await waitFor(() => expect(postMessageMock).toHaveBeenCalled());

    const expectedWindowStartMs = Math.floor(nowMs / WINDOW_MS) * WINDOW_MS;
    const mainRequest = extractRequests().find(
      (request) => request.dayStartMs === expectedWindowStartMs,
    );
    expect(mainRequest).toBeDefined();
    expect(mainRequest?.durationMs).toBe(WINDOW_MS);

    dateNowSpy.mockRestore();
  });

  it("キャッシュヒット時はメイン窓へのWorker送信をスキップし、先読みのみ送信する", async () => {
    const paramsKey = JSON.stringify(SWATH_PARAMS);
    const cached: SwathData = {
      rings: new Float32Array([139, 35, 140, 35, 140, 36]),
      offsets: new Int32Array([0]),
      counts: new Int32Array([3]),
    };
    swathCache.set(`iss:${BASE_START_MS}:${paramsKey}`, cached);

    const { result } = renderHook(() =>
      useSwathData({
        satelliteId: "iss",
        tle1: ISS_TLE1,
        tle2: ISS_TLE2,
        swathParams: SWATH_PARAMS,
        dayStartMs: BASE_START_MS,
      }),
    );

    await waitFor(() => expect(postMessageMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.swathData).toBe(cached));

    const hasMainWindowRequest = extractRequests().some(
      (request) => request.dayStartMs === BASE_START_MS,
    );
    expect(hasMainWindowRequest).toBe(false);
  });
});
