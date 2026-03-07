import { describe, expect, it } from "vitest";
import { PHASE4_MISSION_DEFINITIONS } from "../../../edu/data/mission-definitions";
import { evaluateMission } from "../mission-evaluator";

function getMission(missionId: (typeof PHASE4_MISSION_DEFINITIONS)[number]["id"]) {
  const mission = PHASE4_MISSION_DEFINITIONS.find((item) => item.id === missionId);
  if (!mission) {
    throw new Error(`missing mission definition: ${missionId}`);
  }
  return mission;
}

describe("mission-evaluator", () => {
  it("ミッション1: wide + inclination>=60 + passes>=6 で成功", () => {
    const mission = getMission("cover-japan-day");

    const result = evaluateMission(mission, {
      selectedSatelliteId: null,
      selectedSatelliteIconType: null,
      customDraft: { altitudeKm: 700, inclinationDeg: 65, cameraMode: "wide" },
      launchedCustomSatellite: {
        altitudeKm: 700,
        inclinationDeg: 65,
        cameraMode: "wide",
        launchEpochMs: 0,
        orbitPeriodMin: 98,
        speedKmS: 7.5,
        orbitsPerDay: 14,
        japanPassesPerDay: 6,
        footprintFovDeg: 18,
      },
    });

    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("ミッション1: 各条件不足で理由コードを返す", () => {
    const mission = getMission("cover-japan-day");

    const result = evaluateMission(mission, {
      selectedSatelliteId: null,
      selectedSatelliteIconType: null,
      customDraft: { altitudeKm: 700, inclinationDeg: 40, cameraMode: "detail" },
      launchedCustomSatellite: {
        altitudeKm: 700,
        inclinationDeg: 40,
        cameraMode: "detail",
        launchEpochMs: 0,
        orbitPeriodMin: 98,
        speedKmS: 7.5,
        orbitsPerDay: 14,
        japanPassesPerDay: 3,
        footprintFovDeg: 6,
      },
    });

    expect(result.passed).toBe(false);
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      "camera-mode",
      "inclination-too-low",
      "insufficient-passes",
    ]);
  });

  it("ミッション2: detail + altitude<=900 + passes>=5 で成功", () => {
    const mission = getMission("rapid-disaster-response");

    const result = evaluateMission(mission, {
      selectedSatelliteId: null,
      selectedSatelliteIconType: null,
      customDraft: { altitudeKm: 850, inclinationDeg: 80, cameraMode: "detail" },
      launchedCustomSatellite: {
        altitudeKm: 850,
        inclinationDeg: 80,
        cameraMode: "detail",
        launchEpochMs: 0,
        orbitPeriodMin: 102,
        speedKmS: 7.2,
        orbitsPerDay: 13,
        japanPassesPerDay: 5,
        footprintFovDeg: 6,
      },
    });

    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("ミッション2: 高度超過と通過回数不足を検出する", () => {
    const mission = getMission("rapid-disaster-response");

    const result = evaluateMission(mission, {
      selectedSatelliteId: null,
      selectedSatelliteIconType: null,
      customDraft: { altitudeKm: 1200, inclinationDeg: 70, cameraMode: "detail" },
      launchedCustomSatellite: {
        altitudeKm: 1200,
        inclinationDeg: 70,
        cameraMode: "detail",
        launchEpochMs: 0,
        orbitPeriodMin: 110,
        speedKmS: 6.9,
        orbitsPerDay: 12,
        japanPassesPerDay: 3,
        footprintFovDeg: 6,
      },
    });

    expect(result.passed).toBe(false);
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      "altitude-too-high",
      "insufficient-passes",
    ]);
  });

  it("ミッション3: 既存SAR衛星選択で成功し、それ以外は失敗", () => {
    const mission = getMission("night-ocean-observation");

    const sarResult = evaluateMission(mission, {
      selectedSatelliteId: "sentinel1a",
      selectedSatelliteIconType: "sar",
      customDraft: { altitudeKm: 700, inclinationDeg: 60, cameraMode: "wide" },
      launchedCustomSatellite: null,
    });
    expect(sarResult.passed).toBe(true);

    const opticalResult = evaluateMission(mission, {
      selectedSatelliteId: "sentinel2a",
      selectedSatelliteIconType: "optical",
      customDraft: { altitudeKm: 700, inclinationDeg: 60, cameraMode: "wide" },
      launchedCustomSatellite: null,
    });
    expect(opticalResult.passed).toBe(false);
    expect(opticalResult.reasons[0]?.code).toBe("satellite-type-mismatch");

    const noSelectionResult = evaluateMission(mission, {
      selectedSatelliteId: null,
      selectedSatelliteIconType: null,
      customDraft: { altitudeKm: 700, inclinationDeg: 60, cameraMode: "wide" },
      launchedCustomSatellite: null,
    });
    expect(noSelectionResult.passed).toBe(false);
    expect(noSelectionResult.reasons[0]?.code).toBe("select-existing-satellite");
  });
});
