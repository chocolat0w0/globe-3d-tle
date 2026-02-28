import { useState, useEffect, useRef } from "react";
import type { TLEData } from "../types/satellite";
import { computeRealtimePosition, type RealtimePosition } from "../lib/tle/orbital-elements";

/**
 * 1秒間隔でリアルタイムの衛星位置を更新するフック。
 * tle が null の場合は null を返す。
 */
export function useSatelliteRealtime(tle: TLEData | null): RealtimePosition | null {
  const [position, setPosition] = useState<RealtimePosition | null>(null);
  // useRef で TLE を保持し、interval 関数内から常に最新値を参照できるようにする
  const tleRef = useRef(tle);
  tleRef.current = tle;
  const line1 = tle?.line1;
  const line2 = tle?.line2;

  useEffect(() => {
    if (!line1 || !line2) {
      setPosition(null);
      return;
    }

    // マウント時に即座に1回計算
    setPosition(computeRealtimePosition(line1, line2, new Date()));

    const id = setInterval(() => {
      const current = tleRef.current;
      if (!current) return;
      setPosition(computeRealtimePosition(current.line1, current.line2, new Date()));
    }, 1000);

    return () => clearInterval(id);
    // NOTE: depend on TLE string values, not object identity.
    // Callers may recreate equivalent objects every render.
  }, [line1, line2]);

  return position;
}
