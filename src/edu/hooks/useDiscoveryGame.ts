import { useCallback, useMemo, useState } from "react";
import { DISCOVERY_CREATURES } from "../data/discovery-creatures";
import { DISCOVERY_LOCATIONS } from "../data/discovery-locations";
import { generateDiscoveryImageUrl } from "../lib/discovery-image-pipeline";
import type {
  DiscoveryCreature,
  DiscoveryGameState,
  DiscoveryScenario,
} from "../types/target-discovery";

export interface UseDiscoveryGameResult {
  gameState: DiscoveryGameState;
  startGame: () => void;
  /** Select a satellite for wide scan. Returns error message if resolution is too fine. */
  confirmWideSatellite: (
    satelliteId: string,
    resolutionMeters: number,
  ) => { success: boolean; error: string | null };
  /** Capture wide-scan image (call when FP overlaps search area). */
  captureWideScan: (resolutionMeters: number) => void;
  /** Proceed from wide-scan-captured to detail-scan-select. */
  proceedToDetailSelect: () => void;
  /** Select a satellite for detail scan. Returns error message if resolution is too coarse. */
  confirmDetailSatellite: (
    satelliteId: string,
    resolutionMeters: number,
  ) => { success: boolean; error: string | null };
  /** Capture detail-scan image (call when FP overlaps search area). */
  captureDetailScan: (resolutionMeters: number) => void;
  /** Go back from wide-scan-fly to wide-scan-select (re-pick satellite). */
  backToWideScanSelect: () => void;
  /** Go back from detail-scan-fly to detail-scan-select (re-pick satellite). */
  backToDetailScanSelect: () => void;
  /** Proceed from detail-scan-captured to identify. */
  proceedToIdentify: () => void;
  /** Submit creature identification. Returns true if correct. */
  submitIdentification: (creatureId: string) => boolean;
  resetGame: () => void;
  /** Ordered creature choices for the identify step (correct + 3 decoys, shuffled). */
  identifyChoices: DiscoveryCreature[];
  /** Satellite whose FP should be shown on the globe during fly steps. null otherwise. */
  activeScanSatelliteId: string | null;
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

  const creatureOffset = {
    x: (Math.random() - 0.5) * 1.6, // -0.8 to 0.8
    y: (Math.random() - 0.5) * 1.6,
  };

  return { creature, location, decoyCreatures, creatureOffset };
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
    setGameState((prev) => ({ ...prev, step: "wide-scan-select" }));
  }, []);

  const confirmWideSatellite = useCallback(
    (satelliteId: string, resolutionMeters: number): { success: boolean; error: string | null } => {
      if (resolutionMeters < WIDE_MIN_RESOLUTION) {
        return {
          success: false,
          error:
            "この衛星は視野がせまいよ。まずは広い範囲を見わたせる衛星（解像度5m以上）を選ぼう！",
        };
      }
      setGameState((prev) => ({
        ...prev,
        step: "wide-scan-fly",
        wideScanSatelliteId: satelliteId,
      }));
      return { success: true, error: null };
    },
    [],
  );

  const captureWideScan = useCallback(
    (resolutionMeters: number) => {
      const imageUrl = generateDiscoveryImageUrl({
        location: gameState.scenario.location,
        creature: gameState.scenario.creature,
        resolutionMeters,
        creatureOffset: gameState.scenario.creatureOffset,
      });
      setGameState((prev) => ({
        ...prev,
        step: "wide-scan-captured",
        wideScanImageUrl: imageUrl,
      }));
    },
    [gameState.scenario],
  );

  const backToWideScanSelect = useCallback(() => {
    setGameState((prev) => ({ ...prev, step: "wide-scan-select", wideScanSatelliteId: null }));
  }, []);

  const proceedToDetailSelect = useCallback(() => {
    setGameState((prev) => ({ ...prev, step: "detail-scan-select" }));
  }, []);

  const confirmDetailSatellite = useCallback(
    (satelliteId: string, resolutionMeters: number): { success: boolean; error: string | null } => {
      if (resolutionMeters > DETAIL_MAX_RESOLUTION) {
        return {
          success: false,
          error: "この衛星では細かいところが見えないよ。もっと解像度の高い衛星（1m以下）を選ぼう！",
        };
      }
      setGameState((prev) => ({
        ...prev,
        step: "detail-scan-fly",
        detailScanSatelliteId: satelliteId,
      }));
      return { success: true, error: null };
    },
    [],
  );

  const backToDetailScanSelect = useCallback(() => {
    setGameState((prev) => ({ ...prev, step: "detail-scan-select", detailScanSatelliteId: null }));
  }, []);

  const captureDetailScan = useCallback(
    (resolutionMeters: number) => {
      const imageUrl = generateDiscoveryImageUrl({
        location: gameState.scenario.location,
        creature: gameState.scenario.creature,
        resolutionMeters,
        creatureOffset: gameState.scenario.creatureOffset,
      });
      setGameState((prev) => ({
        ...prev,
        step: "detail-scan-captured",
        detailScanImageUrl: imageUrl,
      }));
    },
    [gameState.scenario],
  );

  const proceedToIdentify = useCallback(() => {
    setGameState((prev) => ({ ...prev, step: "identify" }));
  }, []);

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

  const activeScanSatelliteId = useMemo(() => {
    if (gameState.step === "wide-scan-fly") return gameState.wideScanSatelliteId;
    if (gameState.step === "detail-scan-fly") return gameState.detailScanSatelliteId;
    return null;
  }, [gameState.step, gameState.wideScanSatelliteId, gameState.detailScanSatelliteId]);

  return {
    gameState,
    startGame,
    confirmWideSatellite,
    captureWideScan,
    backToWideScanSelect,
    proceedToDetailSelect,
    confirmDetailSatellite,
    captureDetailScan,
    backToDetailScanSelect,
    proceedToIdentify,
    submitIdentification,
    resetGame,
    identifyChoices,
    activeScanSatelliteId,
  };
}
