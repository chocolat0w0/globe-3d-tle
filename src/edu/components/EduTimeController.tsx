import { useEffect, useRef, useState } from "react";
import { ClockRange, JulianDate } from "cesium";
import { useCesium } from "resium";
import { getWindowStartMs } from "../../lib/time-window";
import { formatJstDateTime } from "./format-jst";
import "./EduTimeController.css";

const DAY_MS = 86_400_000;
const RANGE_DAYS = 3;
const SPEEDS = [10, 60, 300] as const;

interface EduTimeControllerProps {
  onWindowStartChange: (windowStartMs: number) => void;
}

export function EduTimeController({ onWindowStartChange }: EduTimeControllerProps) {
  const { viewer } = useCesium();
  const baseNowMsRef = useRef(Date.now());
  const [currentMs, setCurrentMs] = useState(baseNowMsRef.current);
  const [isPlaying, setIsPlaying] = useState(true);
  const [multiplier, setMultiplier] = useState<number>(60);
  const onWindowStartChangeRef = useRef(onWindowStartChange);
  const previousWindowStartRef = useRef<number | null>(null);

  onWindowStartChangeRef.current = onWindowStartChange;

  useEffect(() => {
    if (!viewer) return;

    const nowMs = baseNowMsRef.current;
    const minMs = nowMs - RANGE_DAYS * DAY_MS;
    const maxMs = nowMs + RANGE_DAYS * DAY_MS;

    viewer.clock.startTime = JulianDate.fromDate(new Date(minMs));
    viewer.clock.stopTime = JulianDate.fromDate(new Date(maxMs));
    viewer.clock.currentTime = JulianDate.fromDate(new Date(nowMs));
    viewer.clock.clockRange = ClockRange.LOOP_STOP;
    viewer.clock.multiplier = 60;
    viewer.clock.shouldAnimate = true;

    const initialWindowStartMs = getWindowStartMs(nowMs);
    previousWindowStartRef.current = initialWindowStartMs;
    onWindowStartChangeRef.current(initialWindowStartMs);
  }, [viewer]);

  useEffect(() => {
    if (!viewer) return;

    const removeListener = viewer.scene.postRender.addEventListener(() => {
      const ms = JulianDate.toDate(viewer.clock.currentTime).getTime();
      setCurrentMs((previous) => (Math.abs(previous - ms) >= 500 ? ms : previous));

      const windowStartMs = getWindowStartMs(ms);
      if (windowStartMs !== previousWindowStartRef.current) {
        previousWindowStartRef.current = windowStartMs;
        onWindowStartChangeRef.current(windowStartMs);
      }
    });

    return () => {
      removeListener();
    };
  }, [viewer]);

  const minMs = baseNowMsRef.current - RANGE_DAYS * DAY_MS;
  const maxMs = baseNowMsRef.current + RANGE_DAYS * DAY_MS;

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

  function handleSetMultiplier(nextMultiplier: (typeof SPEEDS)[number]) {
    if (!viewer) return;
    viewer.clock.multiplier = nextMultiplier;
    setMultiplier(nextMultiplier);
  }

  return (
    <div className="edu-time-controller">
      <div className="edu-time-header">
        <span className="edu-time-label">時間コントロール</span>
        <span className="edu-time-current">{formatJstDateTime(currentMs)}</span>
      </div>

      <div className="edu-time-row">
        <button
          type="button"
          className="edu-time-play-button"
          onClick={handlePlayPause}
          aria-label={isPlaying ? "一時停止" : "再生"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <div className="edu-time-speed-group" role="group" aria-label="再生速度">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={`edu-time-speed-button ${multiplier === speed ? "is-active" : ""}`.trim()}
              onClick={() => handleSetMultiplier(speed)}
              aria-pressed={multiplier === speed}
            >
              ×{speed}
            </button>
          ))}
        </div>
      </div>

      <label className="edu-time-slider-label" htmlFor="edu-time-slider">
        3日ぶんを前後に移動
      </label>
      <input
        id="edu-time-slider"
        type="range"
        min={minMs}
        max={maxMs}
        value={currentMs}
        step={1000}
        onChange={(event) => handleSeek(Number(event.target.value))}
        className="edu-time-slider"
        aria-label="時間スライダー"
      />
    </div>
  );
}
