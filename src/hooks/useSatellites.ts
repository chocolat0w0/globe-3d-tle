import { useState, useCallback } from "react";
import type { Satellite } from "../types/satellite";
import rawTle from "../data/sample-tle.json";

type TleEntry = { id: string; name: string; tle: { line1: string; line2: string }; color: string };

const tleEntries = rawTle satisfies TleEntry[];
const INITIAL: Satellite[] = tleEntries.map((s) => ({
  id: s.id,
  name: s.name,
  tle: s.tle,
  color: s.color,
  visible: true,
  selected: false,
  showFootprint: false,
  showSwath: false,
}));

interface UseSatellitesResult {
  satellites: Satellite[];
  toggleVisible: (id: string) => void;
  selectSatellite: (id: string) => void;
  toggleFootprint: (id: string) => void;
  toggleSwath: (id: string) => void;
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
      prev.map((s) => {
        if (s.id !== id) return s;
        const newVisible = !s.visible;
        // 非表示にする場合は追尾選択も解除して UI/Cesium 状態の整合性を保つ
        return { ...s, visible: newVisible, selected: newVisible ? s.selected : false };
      })
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

  const toggleFootprint = useCallback((id: string) => {
    setSatellites((prev) =>
      prev.map((s) => (s.id === id ? { ...s, showFootprint: !s.showFootprint } : s))
    );
  }, []);

  const toggleSwath = useCallback((id: string) => {
    setSatellites((prev) =>
      prev.map((s) => (s.id === id ? { ...s, showSwath: !s.showSwath } : s))
    );
  }, []);

  return { satellites, toggleVisible, selectSatellite, toggleFootprint, toggleSwath };
}
