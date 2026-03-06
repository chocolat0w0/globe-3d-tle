import { useEffect, useRef, useState } from "react";
import {
  computeCustomRealtimePosition,
  type CustomRealtimePosition,
  type LaunchedCustomSatellite,
} from "../../lib/edu/custom-orbit";

/**
 * 1秒ごとに自作衛星の現在位置を更新する。
 */
export function useCustomSatelliteRealtime(
  launchedCustomSatellite: LaunchedCustomSatellite | null,
): CustomRealtimePosition | null {
  const [position, setPosition] = useState<CustomRealtimePosition | null>(null);
  const launchedRef = useRef(launchedCustomSatellite);
  launchedRef.current = launchedCustomSatellite;

  useEffect(() => {
    if (!launchedCustomSatellite) {
      setPosition(null);
      return;
    }

    setPosition(computeCustomRealtimePosition(launchedCustomSatellite, Date.now()));

    const id = setInterval(() => {
      const current = launchedRef.current;
      if (!current) return;
      setPosition(computeCustomRealtimePosition(current, Date.now()));
    }, 1000);

    return () => clearInterval(id);
  }, [launchedCustomSatellite]);

  return position;
}
