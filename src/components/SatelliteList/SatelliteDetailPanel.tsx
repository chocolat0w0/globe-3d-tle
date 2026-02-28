import { useMemo } from "react";
import type { Satellite } from "../../types/satellite";
import type { OffnadirRange } from "../../lib/tle/offnadir-ranges";
import { extractOrbitalElements } from "../../lib/tle/orbital-elements";
import { useSatelliteRealtime } from "../../hooks/useSatelliteRealtime";

function formatDeg(deg: number): string {
  return deg >= 0 ? `+${deg}°` : `${deg}°`;
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="satellite-detail-kv-row">
      <span className="satellite-detail-kv-label">{label}</span>
      <span className="satellite-detail-kv-value">{value}</span>
    </div>
  );
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

function OrbitalElementsSection({ tle1, tle2 }: { tle1: string; tle2: string }) {
  const elements = useMemo(() => extractOrbitalElements(tle1, tle2), [tle1, tle2]);

  return (
    <div className="satellite-detail-section">
      <div className="satellite-detail-section-label">軌道要素</div>
      <div className="satellite-detail-kv-list">
        <KVRow label="NORAD ID" value={elements.noradId} />
        <KVRow label="国際識別子" value={elements.intlDesignator || "—"} />
        <KVRow
          label="元期"
          value={elements.epoch.toISOString().replace("T", " ").slice(0, 19) + " UTC"}
        />
        <KVRow label="軌道傾斜角" value={`${elements.inclinationDeg.toFixed(2)}°`} />
        <KVRow label="離心率" value={elements.eccentricity.toFixed(7)} />
        <KVRow label="軌道周期" value={`${elements.periodMin.toFixed(1)} min`} />
        <KVRow label="概算高度" value={`${elements.altitudeKm.toFixed(1)} km`} />
      </div>
    </div>
  );
}

function RealtimeSection({ tle1, tle2 }: { tle1: string; tle2: string }) {
  const pos = useSatelliteRealtime({ line1: tle1, line2: tle2 });

  return (
    <div className="satellite-detail-section">
      <div className="satellite-detail-section-label">リアルタイム位置</div>
      <div className="satellite-detail-kv-list">
        {pos ? (
          <>
            <KVRow label="緯度" value={`${pos.latDeg.toFixed(4)}°`} />
            <KVRow label="経度" value={`${pos.lonDeg.toFixed(4)}°`} />
            <KVRow label="高度" value={`${pos.altKm.toFixed(1)} km`} />
            <KVRow label="速度" value={`${pos.speedKmS.toFixed(3)} km/s`} />
          </>
        ) : (
          <KVRow label="状態" value="計算中…" />
        )}
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
        <OrbitalElementsSection tle1={satellite.tle.line1} tle2={satellite.tle.line2} />
        <RealtimeSection tle1={satellite.tle.line1} tle2={satellite.tle.line2} />
      </div>
    </div>
  );
}
