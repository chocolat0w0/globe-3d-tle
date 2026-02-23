import type { Satellite } from "../../types/satellite";

interface Props {
  satellites: Satellite[];
  onToggleVisible: (id: string) => void;
  onSelect: (id: string) => void;
  onToggleFootprint: (id: string) => void;
  onToggleSwath: (id: string) => void;
}

export function SatelliteList({
  satellites,
  onToggleVisible,
  onSelect,
  onToggleFootprint,
  onToggleSwath,
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
        クリックで追尾 / FP: フットプリント / SW: スワス / チェック: 表示切替
      </div>
    </div>
  );
}
