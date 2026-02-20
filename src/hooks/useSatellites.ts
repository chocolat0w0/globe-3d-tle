import { useState, useCallback } from "react";
import type { Satellite } from "../types/satellite";
import rawTle from "../data/sample-tle.json";

type TleEntry = { id: string; name: string; tle: { line1: string; line2: string }; color: string };

const INITIAL: Satellite[] = (rawTle as TleEntry[]).map((s) => ({
  id: s.id,
  name: s.name,
  tle: s.tle,
  color: s.color,
  visible: true,
  selected: false,
}));

interface UseSatellitesResult {
  satellites: Satellite[];
  toggleVisible: (id: string) => void;
  selectSatellite: (id: string) => void;
}

/**
 * 10機の衛星リスト状態を管理するフック
 *
 * - toggleVisible: ON/OFF切替
 * - selectSatellite: 選択（同じIDを再度呼ぶと選択解除、他は自動で解除）
 */
export function useSatellites(): UseSatellitesResult {
  const [satellites, setSatellites] = useState<Satellite[]>(INITIAL);

  const toggleVisible = useCallback((id: string) => {
    setSatellites((prev) =>
      prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s))
    );
  }, []);

  const selectSatellite = useCallback((id: string) => {
    setSatellites((prev) =>
      prev.map((s) => ({
        ...s,
        selected: s.id === id ? !s.selected : false,
      }))
    );
  }, []);

  return { satellites, toggleVisible, selectSatellite };
}
