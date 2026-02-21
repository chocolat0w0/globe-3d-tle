import { formatUTC } from "./time-format";

interface TimeSliderProps {
  currentMs: number;
  minMs: number;
  maxMs: number;
  onSeek: (ms: number) => void;
}

export function TimeSlider({ currentMs, minMs, maxMs, onSeek }: TimeSliderProps) {
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          textAlign: "center",
          color: "#e8e8e8",
          fontFamily: "monospace",
          fontSize: 13,
          marginBottom: 4,
          userSelect: "none",
        }}
        aria-label="現在時刻"
      >
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
        style={{ width: "100%", cursor: "pointer" }}
      />
    </div>
  );
}
