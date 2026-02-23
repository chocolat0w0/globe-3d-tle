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
    <div className="playback-controls">
      <button
        onClick={onPlayPause}
        aria-label={isPlaying ? "一時停止" : "再生"}
        className="playback-primary"
      >
        {isPlaying ? "⏸" : "▶"}
      </button>

      <div className="speed-button-group">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            onClick={() => onSetMultiplier(speed)}
            aria-pressed={multiplier === speed}
            className={`ui-button speed-button ${multiplier === speed ? "is-active" : ""}`.trim()}
          >
            ×{speed}
          </button>
        ))}
      </div>
    </div>
  );
}
