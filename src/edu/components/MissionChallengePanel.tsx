import type { CustomSatelliteDraft, LaunchedCustomSatellite } from "../../lib/edu/custom-orbit";
import { evaluateMission } from "../../lib/edu/mission-evaluator";
import type { EduSatellite } from "../hooks/useEduSatellites";
import type { UseDiscoveryGameResult } from "../hooks/useDiscoveryGame";
import type { MissionDefinition, MissionEvaluation, MissionId, MissionProgress } from "../types/phase4";
import type { DiscoveryGameState } from "../types/target-discovery";
import { DiscoveryMissionBody } from "./DiscoveryMissionBody";
import { SatelliteDesignControls } from "./SatelliteDesignControls";
import "./MissionChallengePanel.css";

interface MissionChallengePanelProps {
  missions: MissionDefinition[];
  activeMissionId: MissionId;
  progress: MissionProgress;
  satellites: EduSatellite[];
  selectedSatelliteId: string | null;
  customDraft: CustomSatelliteDraft;
  launchedCustomSatellite: LaunchedCustomSatellite | null;
  onSelectMission: (missionId: MissionId) => void;
  onSelectSatellite: (satelliteId: string) => void;
  onDraftChange: (patch: Partial<CustomSatelliteDraft>) => void;
  onLaunch: () => void;
  onEvaluateMission: (evaluation: MissionEvaluation) => void;
  onResetProgress: () => void;
  discoveryGame: UseDiscoveryGameResult | null;
  discoveryState: DiscoveryGameState | null;
}

const SENSOR_LABEL: Record<EduSatellite["iconType"], string> = {
  optical: "光学",
  sar: "SAR",
  weather: "気象",
};

export function MissionChallengePanel({
  missions,
  activeMissionId,
  progress,
  satellites,
  selectedSatelliteId,
  customDraft,
  launchedCustomSatellite,
  onSelectMission,
  onSelectSatellite,
  onDraftChange,
  onLaunch,
  onEvaluateMission,
  onResetProgress,
  discoveryGame,
  discoveryState,
}: MissionChallengePanelProps) {
  const activeMission =
    missions.find((mission) => mission.id === activeMissionId) ?? missions[0] ?? null;
  const selectedSatellite = satellites.find((satellite) => satellite.id === selectedSatelliteId) ?? null;

  if (!activeMission) {
    return (
      <section className="edu-mission-panel" aria-label="ミッションチャレンジ">
        <p>ミッション定義を読み込み中です…</p>
      </section>
    );
  }

  const currentEvaluation = progress.evaluations[activeMission.id] ?? null;

  function handleEvaluate() {
    const evaluation = evaluateMission(activeMission, {
      selectedSatelliteId,
      selectedSatelliteIconType: selectedSatellite?.iconType ?? null,
      customDraft,
      launchedCustomSatellite,
      discoveryState,
    });
    onEvaluateMission(evaluation);
  }

  return (
    <section className="edu-mission-panel" aria-label="ミッションチャレンジ">
      <header className="edu-mission-header">
        <div>
          <h2>ミッションチャレンジ</h2>
          <p>条件に合う衛星を選んで、宇宙からの観測ミッションをクリアしよう。</p>
        </div>
        <div className="edu-mission-header-actions">
          {progress.allCleared && <span className="edu-mission-badge">全ミッションクリア！</span>}
          <button type="button" className="edu-mission-reset" onClick={onResetProgress}>
            進捗をリセット
          </button>
        </div>
      </header>

      <ol className="edu-mission-stepper" aria-label="ミッション一覧">
        {missions.map((mission) => {
          const unlocked = progress.unlockedMissionIds.includes(mission.id);
          const cleared = progress.clearedMissionIds.includes(mission.id);
          const isActive = mission.id === activeMission.id;

          return (
            <li key={mission.id}>
              <button
                type="button"
                onClick={() => onSelectMission(mission.id)}
                disabled={!unlocked}
                className={
                  `edu-mission-step ${isActive ? "is-active" : ""} ${cleared ? "is-cleared" : ""}`.trim()
                }
                aria-current={isActive ? "step" : undefined}
              >
                <span>{mission.shortLabel}</span>
                <strong>{mission.title}</strong>
              </button>
            </li>
          );
        })}
      </ol>

      <article className="edu-mission-body">
        <p className="edu-mission-description">{activeMission.description}</p>
        <p className="edu-mission-hint">ヒント: {activeMission.hint}</p>

        {activeMission.kind === "target-discovery" && discoveryGame ? (
          <DiscoveryMissionBody
            satellites={satellites}
            selectedSatelliteId={selectedSatelliteId}
            onSelectSatellite={onSelectSatellite}
            discovery={discoveryGame}
          />
        ) : activeMission.kind === "custom-design" ? (
          <>
            <div className="edu-mission-design-block">
              <SatelliteDesignControls
                draft={customDraft}
                launched={launchedCustomSatellite}
                onDraftChange={onDraftChange}
                onLaunch={onLaunch}
              />
            </div>
            <div className="edu-mission-evaluate-row">
              <button type="button" className="edu-mission-evaluate" onClick={handleEvaluate}>
                この答えで判定する
              </button>
            </div>
          </>
        ) : activeMission.kind === "satellite-selection" ? (
          <>
            <div className="edu-mission-satellite-selector" role="list" aria-label="衛星選択">
              {satellites.map((satellite) => (
                <button
                  key={satellite.id}
                  type="button"
                  role="listitem"
                  className={`edu-mission-satellite-option ${selectedSatelliteId === satellite.id ? "is-selected" : ""}`.trim()}
                  onClick={() => onSelectSatellite(satellite.id)}
                >
                  <span className="name">{satellite.displayName}</span>
                  <span className="meta">
                    {SENSOR_LABEL[satellite.iconType]} / {satellite.resolution.meters}m
                  </span>
                </button>
              ))}
            </div>
            <div className="edu-mission-evaluate-row">
              <button type="button" className="edu-mission-evaluate" onClick={handleEvaluate}>
                この答えで判定する
              </button>
            </div>
          </>
        ) : null}

        {activeMission.kind !== "target-discovery" && currentEvaluation && (
          <div
            className={`edu-mission-result ${currentEvaluation.passed ? "is-success" : "is-failure"}`.trim()}
            aria-live="polite"
          >
            {currentEvaluation.passed ? (
              <p>{currentEvaluation.successMessage}</p>
            ) : (
              <>
                <p>条件をもう少し調整しよう。</p>
                <ul>
                  {currentEvaluation.reasons.map((reason) => (
                    <li key={`${activeMission.id}-${reason.code}`}>{reason.message}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </article>
    </section>
  );
}
