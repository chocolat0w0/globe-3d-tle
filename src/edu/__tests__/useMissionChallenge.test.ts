import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PHASE4_MISSION_DEFINITIONS } from "../data/mission-definitions";
import { useMissionChallenge } from "../hooks/useMissionChallenge";
import type { MissionEvaluation } from "../types/phase4";

function makeEvaluation(missionId: MissionEvaluation["missionId"], passed: boolean): MissionEvaluation {
  return {
    missionId,
    passed,
    reasons: passed ? [] : [{ code: "not-launched", message: "test" }],
    successMessage: "ok",
  };
}

describe("useMissionChallenge", () => {
  it("初期状態で全ミッションに挑戦できる", () => {
    const { result } = renderHook(() => useMissionChallenge());

    expect(result.current.activeMissionId).toBe(PHASE4_MISSION_DEFINITIONS[0]?.id);
    expect(result.current.progress.unlockedMissionIds).toEqual([
      "cover-japan-day",
      "rapid-disaster-response",
      "night-ocean-observation",
    ]);
    expect(result.current.progress.clearedMissionIds).toEqual([]);
    expect(result.current.progress.allCleared).toBe(false);
  });

  it("順不同でクリアしても全クリア状態を管理できる", () => {
    const { result } = renderHook(() => useMissionChallenge());

    act(() => {
      result.current.evaluate(makeEvaluation("night-ocean-observation", true));
    });
    expect(result.current.progress.clearedMissionIds).toEqual(["night-ocean-observation"]);
    expect(result.current.progress.allCleared).toBe(false);

    act(() => {
      result.current.evaluate(makeEvaluation("cover-japan-day", true));
    });
    expect(result.current.progress.clearedMissionIds).toEqual([
      "cover-japan-day",
      "night-ocean-observation",
    ]);

    act(() => {
      result.current.evaluate(makeEvaluation("rapid-disaster-response", true));
    });
    expect(result.current.progress.clearedMissionIds).toEqual([
      "cover-japan-day",
      "rapid-disaster-response",
      "night-ocean-observation",
    ]);
    expect(result.current.progress.allCleared).toBe(true);
  });

  it("失敗判定でも全ミッション選択可のまま評価だけ更新する", () => {
    const { result } = renderHook(() => useMissionChallenge());

    act(() => {
      result.current.evaluate(makeEvaluation("cover-japan-day", false));
    });

    expect(result.current.progress.unlockedMissionIds).toEqual([
      "cover-japan-day",
      "rapid-disaster-response",
      "night-ocean-observation",
    ]);
    expect(result.current.progress.clearedMissionIds).toEqual([]);
    expect(result.current.progress.evaluations["cover-japan-day"]?.passed).toBe(false);
  });

  it("開始直後から任意ミッションをアクティブにできる", () => {
    const { result } = renderHook(() => useMissionChallenge());

    act(() => {
      result.current.setActiveMission("night-ocean-observation");
    });

    expect(result.current.activeMissionId).toBe("night-ocean-observation");
  });

  it("reset で進捗と評価を初期化する", () => {
    const { result } = renderHook(() => useMissionChallenge());

    act(() => {
      result.current.evaluate(makeEvaluation("cover-japan-day", true));
    });
    expect(result.current.progress.clearedMissionIds).toHaveLength(1);

    act(() => {
      result.current.reset();
    });

    expect(result.current.activeMissionId).toBe("cover-japan-day");
    expect(result.current.progress.clearedMissionIds).toEqual([]);
    expect(result.current.progress.unlockedMissionIds).toEqual([
      "cover-japan-day",
      "rapid-disaster-response",
      "night-ocean-observation",
    ]);
    expect(result.current.progress.evaluations).toEqual({});
  });
});
