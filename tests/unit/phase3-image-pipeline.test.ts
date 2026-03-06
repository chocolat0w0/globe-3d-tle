import { describe, expect, it } from "vitest";
import {
  buildPhase3ImageData,
  getAverageLuminance,
  getSpatialDetailScore,
} from "../../src/edu/lib/phase3-image-pipeline";

const BASE_OPTIONS = {
  satelliteId: "worldview3",
  weather: "clear" as const,
  width: 220,
  height: 140,
};

describe("phase3-image-pipeline", () => {
  it("0.3m の方が 500m より空間ディテールが高い", () => {
    const highResolution = buildPhase3ImageData({
      ...BASE_OPTIONS,
      kind: "resolution",
      resolutionMeters: 0.3,
    });
    const lowResolution = buildPhase3ImageData({
      ...BASE_OPTIONS,
      kind: "resolution",
      resolutionMeters: 500,
    });

    const highScore = getSpatialDetailScore(
      highResolution.data,
      highResolution.width,
      highResolution.height,
    );
    const lowScore = getSpatialDetailScore(
      lowResolution.data,
      lowResolution.width,
      lowResolution.height,
    );

    expect(highScore).toBeGreaterThan(lowScore * 1.45);
  });

  it("cloudy で光学画像の平均輝度が上がる", () => {
    const clearOptical = buildPhase3ImageData({
      ...BASE_OPTIONS,
      kind: "optical",
      resolutionMeters: 10,
      weather: "clear",
    });
    const cloudyOptical = buildPhase3ImageData({
      ...BASE_OPTIONS,
      kind: "optical",
      resolutionMeters: 10,
      weather: "cloudy",
    });

    const clearLum = getAverageLuminance(clearOptical.data);
    const cloudyLum = getAverageLuminance(cloudyOptical.data);

    expect(cloudyLum - clearLum).toBeGreaterThan(14);
  });

  it("SAR は cloudy 切替前後で平均輝度がほぼ変わらない", () => {
    const clearSar = buildPhase3ImageData({
      ...BASE_OPTIONS,
      kind: "sar",
      resolutionMeters: 5,
      weather: "clear",
    });
    const cloudySar = buildPhase3ImageData({
      ...BASE_OPTIONS,
      kind: "sar",
      resolutionMeters: 5,
      weather: "cloudy",
    });

    const clearLum = getAverageLuminance(clearSar.data);
    const cloudyLum = getAverageLuminance(cloudySar.data);

    expect(Math.abs(cloudyLum - clearLum)).toBeLessThan(0.0001);
  });
});
