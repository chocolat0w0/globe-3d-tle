import { fireEvent, render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PHASE4_MISSION_DEFINITIONS } from "../data/mission-definitions";
import { MissionChallengePanel } from "../components/MissionChallengePanel";
import { useEduSatellites } from "../hooks/useEduSatellites";
import type { MissionProgress } from "../types/phase4";

function buildProgress(partial: Partial<MissionProgress>): MissionProgress {
  return {
    unlockedMissionIds: partial.unlockedMissionIds ?? ["cover-japan-day"],
    clearedMissionIds: partial.clearedMissionIds ?? [],
    evaluations: partial.evaluations ?? {},
    allCleared: partial.allCleared ?? false,
  };
}

describe("MissionChallengePanel", () => {
  it("全ミッションを初期状態から選択できる", () => {
    const { result } = renderHook(() => useEduSatellites());

    render(
      <MissionChallengePanel
        missions={PHASE4_MISSION_DEFINITIONS}
        activeMissionId="cover-japan-day"
        progress={
          buildProgress({
            unlockedMissionIds: [
              "cover-japan-day",
              "rapid-disaster-response",
              "night-ocean-observation",
            ],
          })
        }
        satellites={result.current.satellites}
        selectedSatelliteId={result.current.selectedSatelliteId}
        customDraft={result.current.customDraft}
        launchedCustomSatellite={result.current.launchedCustomSatellite}
        onSelectMission={vi.fn()}
        onSelectSatellite={vi.fn()}
        onDraftChange={vi.fn()}
        onLaunch={vi.fn()}
        onEvaluateMission={vi.fn()}
        onResetProgress={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /ミッション1/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /ミッション2/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /ミッション3/i })).toBeEnabled();
  });

  it("SAR衛星選択でミッション3判定結果を返す", () => {
    const { result } = renderHook(() => useEduSatellites());
    const onEvaluateMission = vi.fn();

    render(
      <MissionChallengePanel
        missions={PHASE4_MISSION_DEFINITIONS}
        activeMissionId="night-ocean-observation"
        progress={
          buildProgress({
            unlockedMissionIds: [
              "cover-japan-day",
              "rapid-disaster-response",
              "night-ocean-observation",
            ],
            clearedMissionIds: ["cover-japan-day", "rapid-disaster-response"],
          })
        }
        satellites={result.current.satellites}
        selectedSatelliteId="sentinel1a"
        customDraft={result.current.customDraft}
        launchedCustomSatellite={result.current.launchedCustomSatellite}
        onSelectMission={vi.fn()}
        onSelectSatellite={vi.fn()}
        onDraftChange={vi.fn()}
        onLaunch={vi.fn()}
        onEvaluateMission={onEvaluateMission}
        onResetProgress={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "この答えで判定する" }));

    expect(onEvaluateMission).toHaveBeenCalledTimes(1);
    expect(onEvaluateMission.mock.calls[0]?.[0]).toMatchObject({
      missionId: "night-ocean-observation",
      passed: true,
    });
  });

  it("失敗評価を受け取ったとき理由を表示する", () => {
    const { result } = renderHook(() => useEduSatellites());

    render(
      <MissionChallengePanel
        missions={PHASE4_MISSION_DEFINITIONS}
        activeMissionId="night-ocean-observation"
        progress={
          buildProgress({
            unlockedMissionIds: [
              "cover-japan-day",
              "rapid-disaster-response",
              "night-ocean-observation",
            ],
            evaluations: {
              "night-ocean-observation": {
                missionId: "night-ocean-observation",
                passed: false,
                successMessage: "",
                reasons: [{ code: "satellite-type-mismatch", message: "夜の海の観察にはSAR衛星を選ぼう。" }],
              },
            },
          })
        }
        satellites={result.current.satellites}
        selectedSatelliteId="sentinel2a"
        customDraft={result.current.customDraft}
        launchedCustomSatellite={result.current.launchedCustomSatellite}
        onSelectMission={vi.fn()}
        onSelectSatellite={vi.fn()}
        onDraftChange={vi.fn()}
        onLaunch={vi.fn()}
        onEvaluateMission={vi.fn()}
        onResetProgress={vi.fn()}
      />,
    );

    expect(screen.getByText("条件をもう少し調整しよう。")).toBeInTheDocument();
    expect(screen.getByText("夜の海の観察にはSAR衛星を選ぼう。")).toBeInTheDocument();
  });
});
