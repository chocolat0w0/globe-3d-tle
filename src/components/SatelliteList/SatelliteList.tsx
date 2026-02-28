import type { Satellite } from "../../types/satellite";

interface Props {
  satellites: Satellite[];
  onToggleVisible: (id: string) => void;
  onSelect: (id: string) => void;
  onToggleFootprint: (id: string) => void;
  onToggleSwath: (id: string) => void;
  onShowDetail?: (id: string) => void;
}

export function SatelliteList({
  satellites,
  onToggleVisible,
  onSelect,
  onToggleFootprint,
  onToggleSwath,
  onShowDetail,
}: Props) {
  return (
    <div className="ui-panel satellite-panel">
      <div className="satellite-panel-header">
        <div className="ui-panel-title">衛星リスト</div>
        <div className="ui-panel-subtitle">Click to follow target</div>
      </div>
      <div className="satellite-list">
        {satellites.map((sat) => (
          <div
            key={sat.id}
            onClick={() => onSelect(sat.id)}
            className={`satellite-row ${sat.selected ? "is-selected" : ""} ${sat.visible ? "" : "is-dimmed"}`.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              background: sat.selected ? "rgba(255,255,255,0.12)" : "transparent",
              opacity: sat.visible ? 1 : 0.4,
            }}
          >
            <span
              className="satellite-indicator"
              style={{ color: sat.color, background: sat.color }}
            />
            <span className="satellite-name">{sat.name}</span>
            <div className="satellite-actions">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFootprint(sat.id);
                }}
                title={sat.showFootprint ? "フットプリントを非表示" : "フットプリントを表示"}
                className={`satellite-pill ${sat.showFootprint ? "is-active" : ""}`.trim()}
              >
                FP
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSwath(sat.id);
                }}
                title={sat.showSwath ? "スワスを非表示" : "スワスを表示"}
                className={`satellite-pill ${sat.showSwath ? "is-active" : ""}`.trim()}
              >
                SW
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShowDetail?.(sat.id);
                }}
                title="詳細情報を表示"
                className="satellite-pill satellite-pill--info"
                aria-label="詳細情報を表示"
              >
                <svg
                  viewBox="0 0 16 16"
                  width="13"
                  height="13"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeWidth="1" fill="none" />
                  <rect x="7.25" y="7" width="1.5" height="5" rx="0.5" />
                  <circle cx="8" cy="4.5" r="0.9" />
                </svg>
              </button>

              <label className="visibility-toggle" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={sat.visible}
                  onChange={() => onToggleVisible(sat.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`${sat.name} 表示切替`}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="satellite-panel-hint">
        クリックで追尾 / FP: フットプリント / SW: スワス / ⓘ: 詳細 / チェック: 表示切替
      </div>
    </div>
  );
}
