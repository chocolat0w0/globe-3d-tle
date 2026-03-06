import type { Satellite } from "../../types/satellite";
import type { Aoi } from "../../types/polygon";
import type { Pass } from "../../types/pass";
import { usePassPrediction } from "../../hooks/usePassPrediction";
import "./PassPredictionPanel.css";

interface Props {
  satellites: Satellite[];
  aoi: Aoi;
  windowStartMs: number;
  stepSec: number;
  scanWindowCount: number;
  onScanWindowCountChange: (count: number) => void;
  onRunPrediction: () => void;
  trigger: number;
  onJumpToTime: (ms: number) => void;
}

const SCAN_OPTIONS = [
  { label: "4h", count: 1 },
  { label: "24h", count: 6 },
  { label: "48h", count: 12 },
] as const;

export function PassPredictionPanel({
  satellites,
  aoi,
  windowStartMs,
  stepSec,
  scanWindowCount,
  onScanWindowCountChange,
  onRunPrediction,
  trigger,
  onJumpToTime,
}: Props) {
  const { passes, loading, progress } = usePassPrediction({
    satellites,
    aoi,
    windowStartMs,
    stepSec,
    scanWindowCount,
    trigger,
  });

  return (
    <div className="ui-panel pass-prediction-panel">
      <div className="pass-prediction-section">
        <div className="ui-panel-title">Pass Prediction</div>
        <div className="ui-panel-subtitle">衛星通過予測</div>
      </div>

      {/* スキャン範囲選択 */}
      <div className="pass-prediction-section pass-prediction-controls">
        <div className="pass-prediction-scan-row">
          <span className="pass-prediction-label">Scan</span>
          <div className="pass-prediction-scan-buttons">
            {SCAN_OPTIONS.map((opt) => (
              <button
                key={opt.count}
                type="button"
                className={`ui-button pass-prediction-scan-btn ${
                  scanWindowCount === opt.count ? "is-active" : ""
                }`.trim()}
                onClick={() => onScanWindowCountChange(opt.count)}
                disabled={loading}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="ui-button pass-prediction-run-btn"
          onClick={onRunPrediction}
          disabled={loading}
        >
          {loading ? "スキャン中..." : "▶ 通過予測を実行"}
        </button>
      </div>

      {/* プログレス表示 */}
      {loading && progress && (
        <div className="pass-prediction-section pass-prediction-progress">
          <div className="pass-prediction-progress-bar">
            <div
              className="pass-prediction-progress-fill"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <span className="pass-prediction-progress-text">
            {progress.current} / {progress.total}
          </span>
        </div>
      )}

      {/* 結果表示 */}
      {!loading && trigger > 0 && (
        <div className="pass-prediction-section pass-prediction-results">
          {passes.length === 0 ? (
            <div className="pass-prediction-empty">
              指定期間内に通過はありません
            </div>
          ) : (
            <>
              <div className="pass-prediction-count">
                {passes.length} pass{passes.length !== 1 ? "es" : ""} found
              </div>
              <div className="pass-prediction-list">
                {passes.map((pass, i) => (
                  <PassRow key={`${pass.satelliteId}-${pass.startMs}-${i}`} pass={pass} onClick={onJumpToTime} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* フッターヒント */}
      {!loading && passes.length > 0 && (
        <div className="pass-prediction-hint">
          Click a pass to jump to that time
        </div>
      )}
    </div>
  );
}

function PassRow({ pass, onClick }: { pass: Pass; onClick: (ms: number) => void }) {
  const startDate = new Date(pass.startMs);
  const endDate = new Date(pass.endMs);

  const dateStr = formatDateUTC(startDate);
  const startTimeStr = formatTimeUTC(startDate);
  const endTimeStr = formatTimeUTC(endDate);
  const durationStr = formatDuration(pass.durationSec);

  return (
    <button
      type="button"
      className="pass-prediction-row"
      onClick={() => onClick(pass.peakTimeMs)}
      title={`Jump to ${startTimeStr} UTC`}
    >
      <span
        className="pass-prediction-row-dot"
        style={{ backgroundColor: pass.satelliteColor }}
      />
      <div className="pass-prediction-row-info">
        <div className="pass-prediction-row-top">
          <span className="pass-prediction-row-name">{pass.satelliteName}</span>
          <span className="pass-prediction-row-time">
            {startTimeStr} – {endTimeStr}
          </span>
        </div>
        <div className="pass-prediction-row-bottom">
          <span className="pass-prediction-row-date">{dateStr} UTC</span>
          <span className="pass-prediction-row-duration">{durationStr}</span>
        </div>
      </div>
    </button>
  );
}

// --- フォーマッタ ---

function formatDateUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function formatTimeUTC(d: Date): string {
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
