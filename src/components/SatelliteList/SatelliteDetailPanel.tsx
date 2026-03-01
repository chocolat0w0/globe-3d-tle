import { useMemo, useState, useEffect, useCallback } from "react";
import type { Satellite } from "../../types/satellite";
import type { OffnadirRange } from "../../lib/tle/offnadir-ranges";
import { validateOffnadirRanges } from "../../lib/tle/offnadir-ranges";
import { extractOrbitalElements } from "../../lib/tle/orbital-elements";
import { useSatelliteRealtime } from "../../hooks/useSatelliteRealtime";

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="satellite-detail-kv-row">
      <span className="satellite-detail-kv-label">{label}</span>
      <span className="satellite-detail-kv-value">{value}</span>
    </div>
  );
}

type RangeInput = { min: string; max: string };

function OffnadirSection({
  ranges,
  onChange,
}: {
  ranges: OffnadirRange[];
  onChange: (ranges: OffnadirRange[]) => void;
}) {
  const [inputs, setInputs] = useState<RangeInput[]>(() =>
    ranges.map(([min, max]) => ({ min: String(min), max: String(max) })),
  );
  const [error, setError] = useState<string | null>(null);

  // 衛星が切り替わった際にローカル状態をリセット
  useEffect(() => {
    setInputs(ranges.map(([min, max]) => ({ min: String(min), max: String(max) })));
    setError(null);
  }, [ranges]);

  const handleChange = useCallback(
    (updated: RangeInput[]) => {
      setInputs(updated);
      const parsed = updated.map(({ min, max }) => [parseFloat(min), parseFloat(max)]);
      if (parsed.some(([a, b]) => !Number.isFinite(a) || !Number.isFinite(b))) {
        setError("有効な数値を入力してください");
        return;
      }
      try {
        validateOffnadirRanges(parsed as OffnadirRange[]);
        setError(null);
        onChange(parsed as OffnadirRange[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "無効な値です");
      }
    },
    [onChange],
  );

  const handleFieldChange = (index: number, field: "min" | "max", value: string) => {
    const updated = inputs.map((input, i) =>
      i === index ? { ...input, [field]: value } : input,
    );
    handleChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = inputs.filter((_, i) => i !== index);
    handleChange(updated);
  };

  const handleAdd = () => {
    const updated = [...inputs, { min: "0", max: "30" }];
    handleChange(updated);
  };

  return (
    <div className="satellite-detail-section">
      <div className="satellite-detail-section-label">オフナディア角</div>
      <div className="satellite-detail-offnadir-list">
        {inputs.map((input, i) => (
          <div key={i} className="satellite-detail-offnadir-row">
            <span className="satellite-detail-offnadir-index">#{i + 1}</span>
            <input
              type="number"
              className="satellite-detail-offnadir-input"
              value={input.min}
              step="0.1"
              min="-90"
              max="90"
              aria-label={`レンジ${i + 1} 最小値`}
              onChange={(e) => handleFieldChange(i, "min", e.target.value)}
            />
            <span className="satellite-detail-offnadir-sep">—</span>
            <input
              type="number"
              className="satellite-detail-offnadir-input"
              value={input.max}
              step="0.1"
              min="-90"
              max="90"
              aria-label={`レンジ${i + 1} 最大値`}
              onChange={(e) => handleFieldChange(i, "max", e.target.value)}
            />
            <span className="satellite-detail-offnadir-unit">°</span>
            {inputs.length > 1 && (
              <button
                type="button"
                className="satellite-detail-offnadir-remove"
                onClick={() => handleRemove(i)}
                aria-label={`レンジ${i + 1}を削除`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="satellite-detail-offnadir-add"
          onClick={handleAdd}
        >
          + レンジを追加
        </button>
        {error && <div className="satellite-detail-offnadir-error">{error}</div>}
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
  onUpdateOffnadirRanges: (ranges: OffnadirRange[]) => void;
}

export function SatelliteDetailPanel({ satellite, onClose, onUpdateOffnadirRanges }: Props) {
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
        <OffnadirSection ranges={satellite.offnadirRanges} onChange={onUpdateOffnadirRanges} />
        <OrbitalElementsSection tle1={satellite.tle.line1} tle2={satellite.tle.line2} />
        <RealtimeSection tle1={satellite.tle.line1} tle2={satellite.tle.line2} />
      </div>
    </div>
  );
}
