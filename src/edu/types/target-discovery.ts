/** Discovery creature that can be found by satellite observation. */
export interface DiscoveryCreature {
  id: string;
  emoji: string;
  nameJa: string;
  descriptionJa: string;
}

/** Location on the globe where the search area is placed. */
export interface DiscoveryLocation {
  id: string;
  nameJa: string;
  lonDeg: number;
  latDeg: number;
  radiusKm: number;
  terrainSeed: number;
}

/** Steps of the discovery mission game. */
export type DiscoveryStep =
  | "intro"
  | "wide-scan-select"
  | "wide-scan-fly"
  | "wide-scan-captured"
  | "detail-scan-select"
  | "detail-scan-fly"
  | "detail-scan-captured"
  | "identify"
  | "complete";

/** Randomized scenario combining a creature, a location, and decoys. */
export interface DiscoveryScenario {
  creature: DiscoveryCreature;
  location: DiscoveryLocation;
  decoyCreatures: DiscoveryCreature[];
  /** Creature position offset from search area center, normalized [-0.8, 0.8]. */
  creatureOffset: { x: number; y: number };
}

/** Full game state for a discovery mission playthrough. */
export interface DiscoveryGameState {
  step: DiscoveryStep;
  scenario: DiscoveryScenario;
  wideScanSatelliteId: string | null;
  detailScanSatelliteId: string | null;
  identifiedCreatureId: string | null;
  wideScanImageUrl: string | null;
  detailScanImageUrl: string | null;
}

/** Resolution criteria for the target-discovery mission kind. */
export interface DiscoveryMissionCriteria {
  /** Minimum resolution for wide scan (satellites >= this value qualify). */
  wideMinResolutionMeters: number;
  /** Maximum resolution for detail scan (satellites <= this value qualify). */
  detailMaxResolutionMeters: number;
}
