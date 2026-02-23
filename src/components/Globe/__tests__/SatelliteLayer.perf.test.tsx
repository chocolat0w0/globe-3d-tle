import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { SatelliteLayer } from "../SatelliteLayer";
import { perfMetricsStore } from "../../../lib/perf/perf-metrics-store";
import type { OrbitData } from "../../../types/orbit";

vi.mock("resium", () => ({
  Entity: () => null,
  useCesium: () => ({ viewer: undefined }),
}));

const useOrbitDataMock = vi.fn();

vi.mock("../../../hooks/useOrbitData", () => ({
  useOrbitData: (...args: unknown[]) => useOrbitDataMock(...args),
}));

function makeOrbitData(nowMs: number): OrbitData {
  return {
    timesMs: new Float64Array([nowMs, nowMs + 1000]),
    ecef: new Float32Array([7000000, 0, 0, 6999000, 10000, 10000]),
  };
}

describe("SatelliteLayer performance measurement", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    perfMetricsStore.clear();
  });

  it("VITE_PERF_LOG=true のとき sampled-position-build:<id> を push する", () => {
    vi.stubEnv("VITE_PERF_LOG", "true");
    useOrbitDataMock.mockReturnValue({
      orbitData: makeOrbitData(Date.now()),
      loading: false,
      error: null,
    });
    const pushSpy = vi.spyOn(perfMetricsStore, "push");

    render(
      <SatelliteLayer
        id="sentinel1a"
        name="sentinel1a"
        tle={{ line1: "L1", line2: "L2" }}
        color="#ffffff"
        visible={false}
        selected={false}
        dayStartMs={Date.now()}
        orbitRenderMode="geodesic"
      />,
    );

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "callback-position-build:sentinel1a",
      }),
    );
  });

  it("VITE_PERF_LOG=false のとき push しない", () => {
    vi.stubEnv("VITE_PERF_LOG", "false");
    useOrbitDataMock.mockReturnValue({
      orbitData: makeOrbitData(Date.now()),
      loading: false,
      error: null,
    });
    const pushSpy = vi.spyOn(perfMetricsStore, "push");

    render(
      <SatelliteLayer
        id="sentinel1a"
        name="sentinel1a"
        tle={{ line1: "L1", line2: "L2" }}
        color="#ffffff"
        visible={false}
        selected={false}
        dayStartMs={Date.now()}
        orbitRenderMode="geodesic"
      />,
    );

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("orbitData がないとき push しない", () => {
    vi.stubEnv("VITE_PERF_LOG", "true");
    useOrbitDataMock.mockReturnValue({
      orbitData: null,
      loading: false,
      error: null,
    });
    const pushSpy = vi.spyOn(perfMetricsStore, "push");

    render(
      <SatelliteLayer
        id="sentinel1a"
        name="sentinel1a"
        tle={{ line1: "L1", line2: "L2" }}
        color="#ffffff"
        visible={false}
        selected={false}
        dayStartMs={Date.now()}
        orbitRenderMode="geodesic"
      />,
    );

    expect(pushSpy).not.toHaveBeenCalled();
  });
});
