import { useState, useCallback } from "react";
import type { Satellite } from "../types/satellite";
import rawTle from "../data/sample-tle.json";
import type { OffnadirRange } from "../lib/tle/offnadir-ranges";

type TleEntry = {
  id: string;
  name: string;
  catalogNumber?: number;
  tle: { line1: string; line2: string };
  offnadirRanges: number[][];
  color: string;
};

const tleEntries = rawTle satisfies TleEntry[];

/** 起動時に visible=true にする衛星の数 */
const INITIAL_VISIBLE_COUNT = 3;

/**
 * Fisher-Yatesシャッフルの部分適用でランダムなインデックスを count 個選ぶ。
 * 偏りのない一様なランダム選択を保証する。
 */
function pickRandomIndices(total: number, count: number): Set<number> {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (total - i));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, count));
}

/**
 * 衛星リストの初期状態を生成する。
 * 全衛星のうちランダムに INITIAL_VISIBLE_COUNT 基のみ visible=true にすることで
 * 起動時のメモリ負荷を抑える。リスト上の表示順は元のデータ順を維持する。
 */
function buildInitialSatellites(): Satellite[] {
  const visibleIndices = pickRandomIndices(tleEntries.length, INITIAL_VISIBLE_COUNT);
  return tleEntries.map((s, i) => ({
    id: s.id,
    name: s.name,
    catalogNumber: s.catalogNumber,
    tle: s.tle,
    offnadirRanges: s.offnadirRanges.map(([minDeg, maxDeg]) => [minDeg, maxDeg] as OffnadirRange),
    color: s.color,
    visible: visibleIndices.has(i),
    selected: false,
    showFootprint: false,
    showSwath: false,
  }));
}

interface UseSatellitesResult {
  satellites: Satellite[];
  toggleVisible: (id: string) => void;
  selectSatellite: (id: string) => void;
  deselectAll: () => void;
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
  // buildInitialSatellites を関数参照で渡すことで、初回マウント時のみ評価される（遅延初期化）
  const [satellites, setSatellites] = useState<Satellite[]>(buildInitialSatellites);

  const toggleVisible = useCallback((id: string) => {
    setSatellites((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const newVisible = !s.visible;
        // 非表示にする場合は追尾選択も解除して UI/Cesium 状態の整合性を保つ
        return { ...s, visible: newVisible, selected: newVisible ? s.selected : false };
      }),
    );
  }, []);

  const selectSatellite = useCallback((id: string) => {
    setSatellites((prev) =>
      prev.map((s) => ({
        ...s,
        selected: s.id === id ? !s.selected : false,
      })),
    );
  }, []);

  const deselectAll = useCallback(() => {
    setSatellites((prev) => prev.map((s) => ({ ...s, selected: false })));
  }, []);

  const toggleFootprint = useCallback((id: string) => {
    setSatellites((prev) =>
      prev.map((s) => (s.id === id ? { ...s, showFootprint: !s.showFootprint } : s)),
    );
  }, []);

  const toggleSwath = useCallback((id: string) => {
    setSatellites((prev) => prev.map((s) => (s.id === id ? { ...s, showSwath: !s.showSwath } : s)));
  }, []);

  return { satellites, toggleVisible, selectSatellite, deselectAll, toggleFootprint, toggleSwath };
}
