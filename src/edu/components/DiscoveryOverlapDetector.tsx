import { useEffect, useMemo, useRef } from "react";
import { JulianDate } from "cesium";
import { useCesium } from "resium";
import { useFootprintData } from "../../hooks/useFootprintData";
import {
  buildFootprintLookup,
  interpolatePolygonVertices,
  type FootprintLookup,
} from "../../lib/footprint/footprint-interpolator";
import { buildGroundCircle } from "../../lib/edu/custom-orbit";
import { polygonsOverlap } from "../../lib/geo/polygons-overlap";
import type { OffnadirRange } from "../../lib/tle/offnadir-ranges";

interface DiscoveryOverlapDetectorProps {
  satelliteId: string;
  tle1: string;
  tle2: string;
  offnadirRanges: OffnadirRange[];
  searchAreaLonDeg: number;
  searchAreaLatDeg: number;
  searchAreaRadiusKm: number;
  dayStartMs: number;
  onOverlapChange: (isOverlapping: boolean) => void;
}

const OVERLAP_CHECK_INTERVAL_MS = 500;

/**
 * Logic-only component that detects overlap between a satellite's footprint
 * and the search area circle. Renders nothing.
 *
 * Must be placed inside the Cesium component tree (requires useCesium).
 */
export function DiscoveryOverlapDetector({
  satelliteId,
  tle1,
  tle2,
  offnadirRanges,
  searchAreaLonDeg,
  searchAreaLatDeg,
  searchAreaRadiusKm,
  dayStartMs,
  onOverlapChange,
}: DiscoveryOverlapDetectorProps) {
  const { viewer } = useCesium();
  const lookupRef = useRef<FootprintLookup | null>(null);
  const lastCheckRef = useRef(0);
  const lastOverlapRef = useRef(false);
  const onOverlapChangeRef = useRef(onOverlapChange);
  onOverlapChangeRef.current = onOverlapChange;

  const footprintParams = useMemo(
    () => ({ fov: [10, 10] as [number, number], offnadirRanges }),
    [offnadirRanges],
  );

  const { footprintData } = useFootprintData({
    satelliteId,
    tle1,
    tle2,
    footprintParams,
    dayStartMs,
    stepSec: 30,
    enabled: true,
  });

  // Build lookup when footprint data changes
  useEffect(() => {
    lookupRef.current = footprintData ? buildFootprintLookup(footprintData) : null;
  }, [footprintData]);

  // Memoize search area polygon (circle with 32 vertices)
  const searchAreaPoly = useMemo<[number, number][]>(
    () => buildGroundCircle(searchAreaLonDeg, searchAreaLatDeg, searchAreaRadiusKm, 32),
    [searchAreaLonDeg, searchAreaLatDeg, searchAreaRadiusKm],
  );

  // Register postRender listener for throttled overlap checking
  useEffect(() => {
    if (!viewer) return;

    const removeListener = viewer.scene.postRender.addEventListener(() => {
      const now = performance.now();
      if (now - lastCheckRef.current < OVERLAP_CHECK_INTERVAL_MS) return;
      lastCheckRef.current = now;

      const lookup = lookupRef.current;
      if (!lookup || searchAreaPoly.length < 3) {
        if (lastOverlapRef.current) {
          lastOverlapRef.current = false;
          onOverlapChangeRef.current(false);
        }
        return;
      }

      const currentMs = JulianDate.toDate(viewer.clock.currentTime).getTime();

      // Get current footprint polygon (primary polygon, index 0)
      const fpPoly = interpolatePolygonVertices(lookup, currentMs, 0);
      if (!fpPoly || fpPoly.length < 3) {
        if (lastOverlapRef.current) {
          lastOverlapRef.current = false;
          onOverlapChangeRef.current(false);
        }
        return;
      }

      const overlapping = polygonsOverlap(fpPoly, searchAreaPoly);

      // Only fire callback when state changes
      if (overlapping !== lastOverlapRef.current) {
        lastOverlapRef.current = overlapping;
        onOverlapChangeRef.current(overlapping);
      }
    });

    return () => {
      removeListener();
      // Reset overlap state on unmount
      if (lastOverlapRef.current) {
        lastOverlapRef.current = false;
        onOverlapChangeRef.current(false);
      }
    };
  }, [viewer, searchAreaPoly]);

  return null;
}
