import { JAPAN_POLYGONS } from "../../data/japan-polygon";
import { canCoverRegionWithinDay, CUSTOM_SATELLITE_ID } from "./custom-orbit";
import type {
  CustomDesignMissionDefinition,
  MissionDefinition,
  MissionEvaluation,
  MissionEvaluationContext,
  MissionEvaluationReason,
  SatelliteSelectionMissionDefinition,
} from "../../edu/types/phase4";

function evaluateCustomDesignMission(
  mission: CustomDesignMissionDefinition,
  context: MissionEvaluationContext,
): MissionEvaluationReason[] {
  const reasons: MissionEvaluationReason[] = [];
  const launched = context.launchedCustomSatellite;

  if (!launched) {
    return [
      {
        code: "not-launched",
        message: "先に「衛星を打ち上げる」を押して、結果を計算しよう。",
      },
    ];
  }

  const { criteria } = mission;

  if (launched.cameraMode !== criteria.requiredCameraMode) {
    reasons.push({
      code: "camera-mode",
      message:
        criteria.requiredCameraMode === "wide"
          ? "カメラを「広く見える」にしよう。"
          : "カメラを「よく見える」にしよう。",
    });
  }

  if (
    criteria.minInclinationDeg !== undefined &&
    launched.inclinationDeg < criteria.minInclinationDeg
  ) {
    reasons.push({
      code: "inclination-too-low",
      message: `傾きを ${criteria.minInclinationDeg}° 以上にしよう。`,
    });
  }

  if (criteria.maxAltitudeKm !== undefined && launched.altitudeKm > criteria.maxAltitudeKm) {
    reasons.push({
      code: "altitude-too-high",
      message: `高さを ${criteria.maxAltitudeKm.toLocaleString("ja-JP")} km 以下にしよう。`,
    });
  }

  if (
    criteria.minJapanPassesPerDay !== undefined &&
    launched.japanPassesPerDay < criteria.minJapanPassesPerDay
  ) {
    reasons.push({
      code: "insufficient-passes",
      message: `日本上空の通過回数を 1日 ${criteria.minJapanPassesPerDay} 回以上にしよう。`,
    });
  }

  if (criteria.requiresFullJapanCoverage && !canCoverRegionWithinDay(launched, JAPAN_POLYGONS)) {
    reasons.push({
      code: "insufficient-coverage",
      message: "日本列島と沖縄まで、1回で見渡せる広さが必要です。",
    });
  }

  return reasons;
}

function evaluateSatelliteSelectionMission(
  mission: SatelliteSelectionMissionDefinition,
  context: MissionEvaluationContext,
): MissionEvaluationReason[] {
  if (
    !context.selectedSatelliteId ||
    context.selectedSatelliteId === CUSTOM_SATELLITE_ID ||
    !context.selectedSatelliteIconType
  ) {
    return [
      {
        code: "select-existing-satellite",
        message: "既存の衛星から1機選ぼう。",
      },
    ];
  }

  if (context.selectedSatelliteIconType !== mission.criteria.requiredIconType) {
    return [
      {
        code: "satellite-type-mismatch",
        message: "夜の海の観察にはSAR衛星を選ぼう。",
      },
    ];
  }

  return [];
}

export function evaluateMission(
  mission: MissionDefinition,
  context: MissionEvaluationContext,
): MissionEvaluation {
  const reasons =
    mission.kind === "custom-design"
      ? evaluateCustomDesignMission(mission, context)
      : evaluateSatelliteSelectionMission(mission, context);

  return {
    missionId: mission.id,
    passed: reasons.length === 0,
    reasons,
    successMessage: mission.successMessage,
  };
}
