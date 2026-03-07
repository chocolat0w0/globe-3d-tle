import type { CameraMode, CustomSatelliteDraft, LaunchedCustomSatellite } from "../../lib/edu/custom-orbit";
import type { DiscoveryGameState, DiscoveryMissionCriteria } from "./target-discovery";

export type MissionId = "cover-japan-day" | "rapid-disaster-response" | "target-discovery";

export type MissionKind = "custom-design" | "satellite-selection" | "target-discovery";

export type SatelliteIconType = "optical" | "sar" | "weather";

interface BaseMissionDefinition {
  id: MissionId;
  shortLabel: string;
  title: string;
  description: string;
  hint: string;
  successMessage: string;
  kind: MissionKind;
}

export interface MissionCustomDesignCriteria {
  requiredCameraMode: CameraMode;
  minInclinationDeg?: number;
  maxAltitudeKm?: number;
  minJapanPassesPerDay?: number;
  requiresFullJapanCoverage?: boolean;
}

export interface MissionSatelliteSelectionCriteria {
  requiredIconType: SatelliteIconType;
}

export interface CustomDesignMissionDefinition extends BaseMissionDefinition {
  kind: "custom-design";
  criteria: MissionCustomDesignCriteria;
}

export interface SatelliteSelectionMissionDefinition extends BaseMissionDefinition {
  kind: "satellite-selection";
  criteria: MissionSatelliteSelectionCriteria;
}

export interface TargetDiscoveryMissionDefinition extends BaseMissionDefinition {
  kind: "target-discovery";
  criteria: DiscoveryMissionCriteria;
}

export type MissionDefinition =
  | CustomDesignMissionDefinition
  | SatelliteSelectionMissionDefinition
  | TargetDiscoveryMissionDefinition;

export interface MissionEvaluationContext {
  selectedSatelliteId: string | null;
  selectedSatelliteIconType: SatelliteIconType | null;
  customDraft: CustomSatelliteDraft;
  launchedCustomSatellite: LaunchedCustomSatellite | null;
  discoveryState: DiscoveryGameState | null;
}

export type MissionFailureCode =
  | "not-launched"
  | "camera-mode"
  | "inclination-too-low"
  | "altitude-too-high"
  | "insufficient-passes"
  | "insufficient-coverage"
  | "select-existing-satellite"
  | "satellite-type-mismatch"
  | "discovery-not-complete";

export interface MissionEvaluationReason {
  code: MissionFailureCode;
  message: string;
}

export interface MissionEvaluation {
  missionId: MissionId;
  passed: boolean;
  reasons: MissionEvaluationReason[];
  successMessage: string;
}

export interface MissionProgress {
  unlockedMissionIds: MissionId[];
  clearedMissionIds: MissionId[];
  evaluations: Partial<Record<MissionId, MissionEvaluation>>;
  allCleared: boolean;
}
