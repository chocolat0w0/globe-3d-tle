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
  it("初期状態はミッション1のみアンロック", () => {
    const { result } = renderHook(() => useMissionChallenge());

    expect(result.current.activeMissionId).toBe(PHASE4_MISSION_DEFINITIONS[0]?.id);
    expect(result.current.progress.unlockedMissionIds).toEqual([PHASE4_MISSION_DEFINITIONS[0]?.id]);
    expect(result.current.progress.clearedMissionIds).toEqual([]);
    expect(result.current.progress.allCleared).toBe(false);
  });

  it("1→2→3を順番にアンロックし、全クリアを管理する", () => {
    const { result } = renderHook(() => useMissionChallenge());

    act(() => {
      result.current.evaluate(makeEvaluation("cover-japan-day", true));
    });
    expect(result.current.progress.clearedMissionIds).toEqual(["cover-japan-day"]);
    expect(result.current.progress.unlockedMissionIds).toEqual([
      "cover-japan-day",
      "rapid-disaster-response",
    ]);
    expect(result.current.activeMissionId).toBe("rapid-disaster-response");

    act(() => {
      result.current.evaluate(makeEvaluation("rapid-disaster-response", true));
    });
    expect(result.current.progress.unlockedMissionIds).toEqual([
      "cover-japan-day",
      "rapid-disaster-response",
      "night-ocean-observation",
    ]);
    expect(result.current.activeMissionId).toBe("night-ocean-observation");

    act(() => {
      result.current.evaluate(makeEvaluation("night-ocean-observation", true));
    });
    expect(result.current.progress.clearedMissionIds).toEqual([
      "cover-japan-day",
      "rapid-disaster-response",
      "night-ocean-observation",
    ]);
    expect(result.current.progress.allCleared).toBe(true);
  });

  it("失敗判定ではアンロックが進まない", () => {
    const { result } = renderHook(() => useMissionChallenge());

    act(() => {
      result.current.evaluate(makeEvaluation("cover-japan-day", false));
    });

    expect(result.current.progress.unlockedMissionIds).toEqual(["cover-japan-day"]);
    expect(result.current.progress.clearedMissionIds).toEqual([]);
    expect(result.current.progress.evaluations["cover-japan-day"]?.passed).toBe(false);
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
    expect(result.current.progress.unlockedMissionIds).toEqual(["cover-japan-day"]);
    expect(result.current.progress.evaluations).toEqual({});
  });
});
