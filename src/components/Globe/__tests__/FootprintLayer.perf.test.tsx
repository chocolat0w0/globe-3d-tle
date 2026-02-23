import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { FootprintLayer } from "../FootprintLayer";
import { perfMetricsStore } from "../../../lib/perf/perf-metrics-store";
import type { FootprintData } from "../../../types/orbit";

// Entity は命令的管理（viewer.entities.add）に切り替わったため、
// useCesium の viewer に entities.add / entities.remove を追加する
const mockEntityPolygon = {
  material: undefined as unknown,
  outlineColor: undefined as unknown,
};
const mockEntity = { show: true, polygon: mockEntityPolygon };

vi.mock("resium", () => ({
  Entity: () => null,
  useCesium: () => ({
    viewer: {
      entities: {
        add: vi.fn(() => ({ ...mockEntity, polygon: { ...mockEntityPolygon } })),
        remove: vi.fn(),
      },
      clock: {
        currentTime: {},
      },
    },
  }),
}));

const useFootprintDataMock = vi.fn();

vi.mock("../../../hooks/useFootprintData", () => ({
  useFootprintData: (...args: unknown[]) => useFootprintDataMock(...args),
}));

function makeFootprintData(nowMs: number): FootprintData {
  return {
    timesMs: new Float64Array([nowMs]),
    rings: new Float32Array([139.7, 35.6, 139.8, 35.6, 139.75, 35.7]),
    offsets: new Int32Array([0]),
    counts: new Int32Array([3]),
    timeSizes: new Int32Array([1]),
  };
}

describe("FootprintLayer performance measurement", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    perfMetricsStore.clear();
  });

  it("VITE_PERF_LOG=true のとき footprint-update:<id> を push する", () => {
    vi.stubEnv("VITE_PERF_LOG", "true");
    useFootprintDataMock.mockReturnValue({
      footprintData: makeFootprintData(Date.now()),
      loading: false,
      error: null,
    });
    const pushSpy = vi.spyOn(perfMetricsStore, "push");

    render(
      <FootprintLayer
        id="iss"
        tle={{ line1: "L1", line2: "L2" }}
        color="#ffffff"
        visible={false}
        showFootprint
        dayStartMs={Date.now()}
      />,
    );

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "footprint-update:iss",
      }),
    );
  });

  it("VITE_PERF_LOG=false のとき push しない", () => {
    vi.stubEnv("VITE_PERF_LOG", "false");
    useFootprintDataMock.mockReturnValue({
      footprintData: makeFootprintData(Date.now()),
      loading: false,
      error: null,
    });
    const pushSpy = vi.spyOn(perfMetricsStore, "push");

    render(
      <FootprintLayer
        id="iss"
        tle={{ line1: "L1", line2: "L2" }}
        color="#ffffff"
        visible={false}
        showFootprint
        dayStartMs={Date.now()}
      />,
    );

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("footprintData がないとき push しない", () => {
    vi.stubEnv("VITE_PERF_LOG", "true");
    useFootprintDataMock.mockReturnValue({
      footprintData: null,
      loading: false,
      error: null,
    });
    const pushSpy = vi.spyOn(perfMetricsStore, "push");

    render(
      <FootprintLayer
        id="iss"
        tle={{ line1: "L1", line2: "L2" }}
        color="#ffffff"
        visible={false}
        showFootprint
        dayStartMs={Date.now()}
      />,
    );

    expect(pushSpy).not.toHaveBeenCalled();
  });
});
