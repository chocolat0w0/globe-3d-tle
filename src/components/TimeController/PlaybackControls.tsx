const SPEEDS = [1, 10, 60, 300, 1800] as const;
type Speed = (typeof SPEEDS)[number];

interface PlaybackControlsProps {
  isPlaying: boolean;
  multiplier: number;
  onPlayPause: () => void;
  onSetMultiplier: (multiplier: Speed) => void;
}

export function PlaybackControls({
  isPlaying,
  multiplier,
  onPlayPause,
  onSetMultiplier,
}: PlaybackControlsProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 6,
      }}
    >
      <button
        onClick={onPlayPause}
        aria-label={isPlaying ? "一時停止" : "再生"}
        style={{
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 4,
          color: "#e8e8e8",
          padding: "2px 10px",
          fontSize: 16,
          cursor: "pointer",
          minWidth: 36,
        }}
      >
        {isPlaying ? "⏸" : "▶"}
      </button>

      <div style={{ display: "flex", gap: 4 }}>
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            onClick={() => onSetMultiplier(speed)}
            aria-pressed={multiplier === speed}
            style={{
              background:
                multiplier === speed
                  ? "rgba(100,180,255,0.35)"
                  : "rgba(255,255,255,0.1)",
              border:
                multiplier === speed
                  ? "1px solid rgba(100,180,255,0.8)"
                  : "1px solid rgba(255,255,255,0.25)",
              borderRadius: 4,
              color: "#e8e8e8",
              padding: "2px 8px",
              fontSize: 12,
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            ×{speed}
          </button>
        ))}
      </div>
    </div>
  );
}
