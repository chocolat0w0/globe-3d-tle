import type { Satellite } from "../../types/satellite";

interface Props {
  satellites: Satellite[];
  onToggleVisible: (id: string) => void;
  onSelect: (id: string) => void;
}

export function SatelliteList({ satellites, onToggleVisible, onSelect }: Props) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 8,
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
        クリックで追尾 / チェックで表示切替
      </div>
    </div>
  );
}
