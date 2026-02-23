import { formatUTC } from "./time-format";

interface TimeSliderProps {
  currentMs: number;
  minMs: number;
  maxMs: number;
  onSeek: (ms: number) => void;
}

export function TimeSlider({ currentMs, minMs, maxMs, onSeek }: TimeSliderProps) {
  return (
    <div className="time-slider-shell">
      <div className="time-slider-label" aria-label="現在時刻">
        {formatUTC(currentMs)}
      </div>
      <input
        type="range"
        min={minMs}
        max={maxMs}
        value={currentMs}
        step={1000}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="タイムスライダー"
        className="time-slider-input"
      />
    </div>
  );
}
