import type { Satellite } from "../../types/satellite";
import type { OffnadirRange } from "../../lib/tle/offnadir-ranges";

function formatDeg(deg: number): string {
  return deg >= 0 ? `+${deg}°` : `${deg}°`;
}

function OffnadirSection({ ranges }: { ranges: OffnadirRange[] }) {
  return (
    <div className="satellite-detail-section">
      <div className="satellite-detail-section-label">オフナディア角</div>
      <div className="satellite-detail-offnadir-list">
        {ranges.map(([min, max], i) => (
          <div key={i} className="satellite-detail-offnadir-row">
            <span className="satellite-detail-offnadir-index">#{i + 1}</span>
            <span className="satellite-detail-offnadir-range">
              {formatDeg(min)} — {formatDeg(max)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  satellite: Satellite;
  onClose: () => void;
}

export function SatelliteDetailPanel({ satellite, onClose }: Props) {
  return (
    <div className="ui-panel satellite-detail-panel">
      <div className="satellite-detail-header">
        <div className="satellite-detail-header-left">
          <span
            className="satellite-indicator"
            style={{ color: satellite.color, background: satellite.color }}
          />
          <span className="ui-panel-title">{satellite.name}</span>
        </div>
        <button
          type="button"
          className="satellite-detail-close"
          onClick={onClose}
          aria-label="詳細パネルを閉じる"
        >
          ✕
        </button>
      </div>
      <div className="satellite-detail-body">
        <OffnadirSection ranges={satellite.offnadirRanges} />
      </div>
    </div>
  );
}
