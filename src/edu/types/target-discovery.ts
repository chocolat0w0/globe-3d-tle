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
export type DiscoveryStep = "intro" | "wide-scan" | "detail-scan" | "identify" | "complete";

/** Randomized scenario combining a creature, a location, and decoys. */
export interface DiscoveryScenario {
  creature: DiscoveryCreature;
  location: DiscoveryLocation;
  decoyCreatures: DiscoveryCreature[];
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
