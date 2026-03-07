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
              "target-discovery",
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
        discoveryGame={null}
        discoveryState={null}
      />,
    );

    expect(screen.getByRole("button", { name: /ミッション1/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /ミッション2/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /ミッション3/i })).toBeEnabled();
  });

  it("ミッション3のディスカバリーミッションが表示される", () => {
    const { result } = renderHook(() => useEduSatellites());

    render(
      <MissionChallengePanel
        missions={PHASE4_MISSION_DEFINITIONS}
        activeMissionId="target-discovery"
        progress={
          buildProgress({
            unlockedMissionIds: [
              "cover-japan-day",
              "rapid-disaster-response",
              "target-discovery",
            ],
          })
        }
        satellites={result.current.satellites}
        selectedSatelliteId={null}
        customDraft={result.current.customDraft}
        launchedCustomSatellite={result.current.launchedCustomSatellite}
        onSelectMission={vi.fn()}
        onSelectSatellite={vi.fn()}
        onDraftChange={vi.fn()}
        onLaunch={vi.fn()}
        onEvaluateMission={vi.fn()}
        onResetProgress={vi.fn()}
        discoveryGame={null}
        discoveryState={null}
      />,
    );

    expect(screen.getByText(/謎の生き物を発見せよ/)).toBeInTheDocument();
  });

  it("ミッション1の失敗評価を受け取ったとき理由を表示する", () => {
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
              "target-discovery",
            ],
            evaluations: {
              "cover-japan-day": {
                missionId: "cover-japan-day",
                passed: false,
                successMessage: "",
                reasons: [{ code: "not-launched", message: "先に「衛星を打ち上げる」を押して、結果を計算しよう。" }],
              },
            },
          })
        }
        satellites={result.current.satellites}
        selectedSatelliteId={null}
        customDraft={result.current.customDraft}
        launchedCustomSatellite={result.current.launchedCustomSatellite}
        onSelectMission={vi.fn()}
        onSelectSatellite={vi.fn()}
        onDraftChange={vi.fn()}
        onLaunch={vi.fn()}
        onEvaluateMission={vi.fn()}
        onResetProgress={vi.fn()}
        discoveryGame={null}
        discoveryState={null}
      />,
    );

    expect(screen.getByText("条件をもう少し調整しよう。")).toBeInTheDocument();
    expect(screen.getByText("先に「衛星を打ち上げる」を押して、結果を計算しよう。")).toBeInTheDocument();
  });
});
