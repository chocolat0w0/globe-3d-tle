import { useCallback, useMemo, useState } from "react";
import { PHASE4_MISSION_DEFINITIONS } from "../data/mission-definitions";
import type { MissionDefinition, MissionEvaluation, MissionId, MissionProgress } from "../types/phase4";

interface MissionChallengeState {
  activeMissionId: MissionId;
  clearedMissionIds: MissionId[];
  evaluations: Partial<Record<MissionId, MissionEvaluation>>;
}

function sortMissionIds(ids: MissionId[], missionOrder: MissionId[]): MissionId[] {
  return [...ids].sort((a, b) => missionOrder.indexOf(a) - missionOrder.indexOf(b));
}

function computeUnlockedMissionIds(missionOrder: MissionId[], clearedMissionIds: MissionId[]): MissionId[] {
  const unlocked: MissionId[] = [];
  const cleared = new Set(clearedMissionIds);

  for (let index = 0; index < missionOrder.length; index += 1) {
    if (index === 0 || cleared.has(missionOrder[index - 1])) {
      unlocked.push(missionOrder[index]);
      continue;
    }
    break;
  }

  return unlocked;
}

function buildInitialState(missions: MissionDefinition[]): MissionChallengeState {
  const firstMissionId = missions[0]?.id;
  if (!firstMissionId) {
    throw new Error("ミッション定義がありません。");
  }

  return {
    activeMissionId: firstMissionId,
    clearedMissionIds: [],
    evaluations: {},
  };
}

interface UseMissionChallengeResult {
  missions: MissionDefinition[];
  activeMissionId: MissionId;
  activeMission: MissionDefinition;
  progress: MissionProgress;
  setActiveMission: (missionId: MissionId) => void;
  evaluate: (evaluation: MissionEvaluation) => void;
  reset: () => void;
}

export function useMissionChallenge(
  missions: MissionDefinition[] = PHASE4_MISSION_DEFINITIONS,
): UseMissionChallengeResult {
  const missionOrder = useMemo(() => missions.map((mission) => mission.id), [missions]);
  const [state, setState] = useState<MissionChallengeState>(() => buildInitialState(missions));

  const unlockedMissionIds = useMemo(
    () => computeUnlockedMissionIds(missionOrder, state.clearedMissionIds),
    [missionOrder, state.clearedMissionIds],
  );

  const activeMission = useMemo(() => {
    return (
      missions.find((mission) => mission.id === state.activeMissionId) ??
      missions[0] ??
      (() => {
        throw new Error("ミッション定義がありません。");
      })()
    );
  }, [missions, state.activeMissionId]);

  const progress = useMemo<MissionProgress>(
    () => ({
      unlockedMissionIds,
      clearedMissionIds: state.clearedMissionIds,
      evaluations: state.evaluations,
      allCleared: missionOrder.length > 0 && state.clearedMissionIds.length === missionOrder.length,
    }),
    [missionOrder.length, state.clearedMissionIds, state.evaluations, unlockedMissionIds],
  );

  const setActiveMission = useCallback(
    (missionId: MissionId) => {
      setState((previous) => {
        const unlocked = computeUnlockedMissionIds(missionOrder, previous.clearedMissionIds);
        if (!unlocked.includes(missionId)) return previous;
        return {
          ...previous,
          activeMissionId: missionId,
        };
      });
    },
    [missionOrder],
  );

  const evaluate = useCallback(
    (evaluation: MissionEvaluation) => {
      setState((previous) => {
        const unlocked = computeUnlockedMissionIds(missionOrder, previous.clearedMissionIds);
        const nextEvaluations = {
          ...previous.evaluations,
          [evaluation.missionId]: evaluation,
        };

        if (!unlocked.includes(evaluation.missionId) || !evaluation.passed) {
          return {
            ...previous,
            evaluations: nextEvaluations,
          };
        }

        const alreadyCleared = previous.clearedMissionIds.includes(evaluation.missionId);
        const nextCleared = alreadyCleared
          ? previous.clearedMissionIds
          : sortMissionIds([...previous.clearedMissionIds, evaluation.missionId], missionOrder);

        const nextUnlocked = computeUnlockedMissionIds(missionOrder, nextCleared);
        const currentMissionIndex = missionOrder.indexOf(evaluation.missionId);
        const nextMissionId = missionOrder[currentMissionIndex + 1];

        return {
          activeMissionId:
            nextMissionId && nextUnlocked.includes(nextMissionId)
              ? nextMissionId
              : previous.activeMissionId,
          clearedMissionIds: nextCleared,
          evaluations: nextEvaluations,
        };
      });
    },
    [missionOrder],
  );

  const reset = useCallback(() => {
    setState(buildInitialState(missions));
  }, [missions]);

  return {
    missions,
    activeMissionId: state.activeMissionId,
    activeMission,
    progress,
    setActiveMission,
    evaluate,
    reset,
  };
}
