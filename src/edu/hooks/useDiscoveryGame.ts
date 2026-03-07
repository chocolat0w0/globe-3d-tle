import { useCallback, useMemo, useState } from "react";
import { DISCOVERY_CREATURES } from "../data/discovery-creatures";
import { DISCOVERY_LOCATIONS } from "../data/discovery-locations";
import { generateDiscoveryImageUrl } from "../lib/discovery-image-pipeline";
import type {
  DiscoveryCreature,
  DiscoveryGameState,
  DiscoveryLocation,
  DiscoveryScenario,
  DiscoveryStep,
} from "../types/target-discovery";

export interface DiscoveryScanResult {
  success: boolean;
  failureMessage: string | null;
  imageUrl: string | null;
}

export interface UseDiscoveryGameResult {
  gameState: DiscoveryGameState;
  startGame: () => void;
  submitWideScan: (satelliteId: string, resolutionMeters: number) => DiscoveryScanResult;
  submitDetailScan: (satelliteId: string, resolutionMeters: number) => DiscoveryScanResult;
  submitIdentification: (creatureId: string) => boolean;
  resetGame: () => void;
  /** Ordered creature choices for the identify step (correct + 3 decoys, shuffled). */
  identifyChoices: DiscoveryCreature[];
}

const WIDE_MIN_RESOLUTION = 5;
const DETAIL_MAX_RESOLUTION = 1;

function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createRandomScenario(): DiscoveryScenario {
  const creature = pickRandom(DISCOVERY_CREATURES);
  const location = pickRandom(DISCOVERY_LOCATIONS);

  const otherCreatures = DISCOVERY_CREATURES.filter((c) => c.id !== creature.id);
  const decoyCreatures = shuffle(otherCreatures).slice(0, 3);

  return { creature, location, decoyCreatures };
}

function createInitialState(): DiscoveryGameState {
  return {
    step: "intro",
    scenario: createRandomScenario(),
    wideScanSatelliteId: null,
    detailScanSatelliteId: null,
    identifiedCreatureId: null,
    wideScanImageUrl: null,
    detailScanImageUrl: null,
  };
}

export function useDiscoveryGame(): UseDiscoveryGameResult {
  const [gameState, setGameState] = useState<DiscoveryGameState>(createInitialState);

  const startGame = useCallback(() => {
    setGameState((prev) => ({ ...prev, step: "wide-scan" }));
  }, []);

  const submitWideScan = useCallback(
    (satelliteId: string, resolutionMeters: number): DiscoveryScanResult => {
      if (resolutionMeters < WIDE_MIN_RESOLUTION) {
        return {
          success: false,
          failureMessage:
            "この衛星は視野がせまいよ。まずは広い範囲を見わたせる衛星（解像度5m以上）を選ぼう！",
          imageUrl: null,
        };
      }

      const imageUrl = generateDiscoveryImageUrl({
        location: gameState.scenario.location,
        creature: gameState.scenario.creature,
        resolutionMeters,
      });

      setGameState((prev) => ({
        ...prev,
        step: "detail-scan",
        wideScanSatelliteId: satelliteId,
        wideScanImageUrl: imageUrl,
      }));

      return { success: true, failureMessage: null, imageUrl };
    },
    [gameState.scenario],
  );

  const submitDetailScan = useCallback(
    (satelliteId: string, resolutionMeters: number): DiscoveryScanResult => {
      if (resolutionMeters > DETAIL_MAX_RESOLUTION) {
        return {
          success: false,
          failureMessage:
            "この衛星では細かいところが見えないよ。もっと解像度の高い衛星（1m以下）を選ぼう！",
          imageUrl: null,
        };
      }

      const imageUrl = generateDiscoveryImageUrl({
        location: gameState.scenario.location,
        creature: gameState.scenario.creature,
        resolutionMeters,
      });

      setGameState((prev) => ({
        ...prev,
        step: "identify",
        detailScanSatelliteId: satelliteId,
        detailScanImageUrl: imageUrl,
      }));

      return { success: true, failureMessage: null, imageUrl };
    },
    [gameState.scenario],
  );

  const submitIdentification = useCallback(
    (creatureId: string): boolean => {
      const correct = creatureId === gameState.scenario.creature.id;
      if (correct) {
        setGameState((prev) => ({
          ...prev,
          step: "complete",
          identifiedCreatureId: creatureId,
        }));
      }
      return correct;
    },
    [gameState.scenario.creature.id],
  );

  const resetGame = useCallback(() => {
    setGameState(createInitialState());
  }, []);

  const identifyChoices = useMemo(() => {
    const { creature, decoyCreatures } = gameState.scenario;
    return shuffle([creature, ...decoyCreatures]);
  }, [gameState.scenario]);

  return {
    gameState,
    startGame,
    submitWideScan,
    submitDetailScan,
    submitIdentification,
    resetGame,
    identifyChoices,
  };
}
