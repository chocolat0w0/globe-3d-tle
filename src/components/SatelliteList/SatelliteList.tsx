import type { Satellite } from "../../types/satellite";

interface Props {
  satellites: Satellite[];
  onToggleVisible: (id: string) => void;
  onSelect: (id: string) => void;
  onToggleFootprint: (id: string) => void;
  onToggleSwath: (id: string) => void;
}

export function SatelliteList({ satellites, onToggleVisible, onSelect, onToggleFootprint, onToggleSwath }: Props) {
  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: 8,
        background: "rgba(0, 0, 0, 0.72)",
        color: "#e8e8e8",
        borderRadius: 4,
        fontSize: 12,
        fontFamily: "monospace",
        zIndex: 10,
        userSelect: "none",
        minWidth: 200,
      }}
    >
      <div
        style={{
          padding: "6px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          fontWeight: "bold",
          letterSpacing: 1,
        }}
      >
        衛星リスト
      </div>
      {satellites.map((sat) => (
        <div
          key={sat.id}
          onClick={() => onSelect(sat.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 10px",
            cursor: "pointer",
            background: sat.selected ? "rgba(255,255,255,0.12)" : "transparent",
            opacity: sat.visible ? 1 : 0.4,
            transition: "background 0.1s",
          }}
        >
          {/* 色インジケーター */}
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: sat.color,
              flexShrink: 0,
              border: sat.selected ? "2px solid #fff" : "2px solid transparent",
            }}
          />

          {/* 衛星名 */}
          <span style={{ flex: 1, fontSize: 11 }}>{sat.name}</span>

          {/* フットプリント ON/OFF ボタン */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFootprint(sat.id);
            }}
            title={sat.showFootprint ? "フットプリントを非表示" : "フットプリントを表示"}
            style={{
              background: sat.showFootprint ? sat.color : "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 3,
              color: sat.showFootprint ? "#000" : "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontSize: 9,
              padding: "1px 4px",
              lineHeight: 1.4,
              flexShrink: 0,
            }}
          >
            FP
          </button>

          {/* スワス ON/OFF ボタン */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSwath(sat.id);
            }}
            title={sat.showSwath ? "スワスを非表示" : "スワスを表示"}
            style={{
              background: sat.showSwath ? sat.color : "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 3,
              color: sat.showSwath ? "#000" : "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontSize: 9,
              padding: "1px 4px",
              lineHeight: 1.4,
              flexShrink: 0,
            }}
          >
            SW
          </button>

          {/* ON/OFF チェックボックス */}
          <input
            type="checkbox"
            checked={sat.visible}
            onChange={() => onToggleVisible(sat.id)}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: "pointer", accentColor: sat.color }}
          />
        </div>
      ))}
      <div
        style={{
          padding: "4px 10px",
          fontSize: 10,
          color: "rgba(255,255,255,0.4)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        クリックで追尾 / FP: フットプリント / SW: スワス / チェック: 表示切替
      </div>
    </div>
  );
}
