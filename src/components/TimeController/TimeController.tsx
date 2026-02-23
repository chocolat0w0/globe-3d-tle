import { useEffect, useRef, useState } from "react";
import { useCesium } from "resium";
import { JulianDate, ClockRange } from "cesium";
import { TimeSlider } from "./TimeSlider";
import { PlaybackControls } from "./PlaybackControls";

const DAY_MS = 86400000;
const WINDOW_MS = 4 * 3600 * 1000; // 4時間窓
const WINDOW_DAYS = 14;

function getWindowStartMs(ms: number): number {
  return Math.floor(ms / WINDOW_MS) * WINDOW_MS;
}

interface TimeControllerProps {
  onDayChange: (dayStartMs: number) => void;
  aoiDrawing?: boolean;
}

export function TimeController({ onDayChange, aoiDrawing = false }: TimeControllerProps) {
  const { viewer } = useCesium();
  const [currentMs, setCurrentMs] = useState(() => Date.now());
  const [isPlaying, setIsPlaying] = useState(true);
  const [multiplier, setMultiplierState] = useState(60);
  const savedShouldAnimateRef = useRef<boolean | undefined>(undefined);

  // 最新の onDayChange 参照を保持
  const onDayChangeRef = useRef(onDayChange);
  onDayChangeRef.current = onDayChange;

  // 前回の windowStartMs を追跡して変化を検知する
  const prevWindowStartMs = useRef<number | null>(null);

  // Cesium Clock 初期化（viewer が準備できたとき1回だけ実行）
  useEffect(() => {
    if (!viewer) return;

    const nowMs = Date.now();
    const minMs = nowMs - WINDOW_DAYS * DAY_MS;
    const maxMs = nowMs + WINDOW_DAYS * DAY_MS;

    viewer.clock.startTime = JulianDate.fromDate(new Date(minMs));
    viewer.clock.stopTime = JulianDate.fromDate(new Date(maxMs));
    viewer.clock.currentTime = JulianDate.fromDate(new Date(nowMs));
    viewer.clock.clockRange = ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 60;
    viewer.clock.shouldAnimate = true;

    const windowStartMs = getWindowStartMs(nowMs);
    prevWindowStartMs.current = windowStartMs;
    onDayChangeRef.current(windowStartMs);
  }, [viewer]);

  // AOI描画モード中は時刻アニメーションを一時停止し、終了時に元の状態へ復元する
  useEffect(() => {
    if (!viewer) return;
    if (aoiDrawing) {
      savedShouldAnimateRef.current = viewer.clock.shouldAnimate;
      viewer.clock.shouldAnimate = false;
      setIsPlaying(false);
    } else {
      if (savedShouldAnimateRef.current !== undefined) {
        viewer.clock.shouldAnimate = savedShouldAnimateRef.current;
        setIsPlaying(savedShouldAnimateRef.current);
        savedShouldAnimateRef.current = undefined;
      }
    }
  }, [viewer, aoiDrawing]);

  // postRender で現在時刻を React state に同期し、日跨ぎを検知する
  useEffect(() => {
    if (!viewer) return;

    const removeListener = viewer.scene.postRender.addEventListener(() => {
      const ms = JulianDate.toDate(viewer.clock.currentTime).getTime();

      // 500ms 未満の変化はスキップしてレンダリングを抑制
      setCurrentMs((prev) => (Math.abs(prev - ms) >= 500 ? ms : prev));

      // 4時間窓跨ぎ検知
      const windowStartMs = getWindowStartMs(ms);
      if (windowStartMs !== prevWindowStartMs.current) {
        prevWindowStartMs.current = windowStartMs;
        onDayChangeRef.current(windowStartMs);
      }
    });

    return () => {
      removeListener();
    };
  }, [viewer]);

  const nowMs = Date.now();
  const minMs = nowMs - WINDOW_DAYS * DAY_MS;
  const maxMs = nowMs + WINDOW_DAYS * DAY_MS;

  function handleSeek(ms: number) {
    if (!viewer) return;
    viewer.clock.currentTime = JulianDate.fromDate(new Date(ms));
    setCurrentMs(ms);
  }

  function handlePlayPause() {
    if (!viewer) return;
    const next = !isPlaying;
    viewer.clock.shouldAnimate = next;
    setIsPlaying(next);
  }

  function handleSetMultiplier(speed: number) {
    if (!viewer) return;
    viewer.clock.multiplier = speed;
    setMultiplierState(speed);
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 28, // Cesium クレジットバー（~18px）の上に配置
        left: 0,
        right: 0,
        padding: "8px 16px 12px",
        background: "rgba(0, 0, 0, 0.72)",
        zIndex: 100,
        pointerEvents: "auto",
      }}
    >
      <PlaybackControls
        isPlaying={isPlaying}
        multiplier={multiplier}
        onPlayPause={handlePlayPause}
        onSetMultiplier={handleSetMultiplier}
      />
      <TimeSlider currentMs={currentMs} minMs={minMs} maxMs={maxMs} onSeek={handleSeek} />
    </div>
  );
}
