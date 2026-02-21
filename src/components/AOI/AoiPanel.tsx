import { useRef, useState } from "react";
import type { Aoi, AoiDrawingMode } from "../../types/polygon";

interface Props {
  mode: AoiDrawingMode;
  aoi: Aoi | null;
  onSetMode: (mode: AoiDrawingMode) => void;
  onClear: () => void;
  onLoadGeoJSON: (
    json: unknown
  ) => { success: true; aoi: Aoi } | { success: false; error: string };
}

const BTN_BASE: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: 4,
  color: "#e8e8e8",
  padding: "3px 10px",
  cursor: "pointer",
  fontSize: 11,
  fontFamily: "monospace",
  background: "rgba(255,255,255,0.1)",
};

const BTN_ACTIVE: React.CSSProperties = {
  ...BTN_BASE,
  background: "rgba(100,180,255,0.35)",
  borderColor: "rgba(100,180,255,0.6)",
};

const BTN_DISABLED: React.CSSProperties = {
  ...BTN_BASE,
  opacity: 0.35,
  cursor: "default",
};

export function AoiPanel({ mode, aoi, onSetMode, onClear, onLoadGeoJSON }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function toggleMode(next: AoiDrawingMode) {
    setErrorMsg(null);
    onSetMode(mode === next ? "none" : next);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const result = onLoadGeoJSON(json);
        if (!result.success) {
          setErrorMsg(result.error);
        } else {
          setErrorMsg(null);
        }
      } catch {
        setErrorMsg("JSON のパースに失敗しました");
      }
      // 同じファイルを再選択できるようにリセット
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  }

  const modeLabel: Record<AoiDrawingMode, string> = {
    none: "",
    point: "ポイント描画中 — クリックで確定",
    polygon: "ポリゴン描画中 — クリックで頂点追加、ダブルクリックで確定（3点以上）",
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 110,
        right: 8,
        background: "rgba(0, 0, 0, 0.72)",
        color: "#e8e8e8",
        padding: "8px 12px",
        borderRadius: 4,
        fontSize: 12,
        fontFamily: "monospace",
        zIndex: 10,
        pointerEvents: "auto",
        userSelect: "none",
        minWidth: 160,
      }}
    >
      <div style={{ marginBottom: 6, fontWeight: "bold", fontSize: 11, color: "#aaa" }}>
        AOI
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button
          type="button"
          onClick={() => toggleMode("point")}
          aria-pressed={mode === "point"}
          style={mode === "point" ? BTN_ACTIVE : BTN_BASE}
        >
          ポイント
        </button>
        <button
          type="button"
          onClick={() => toggleMode("polygon")}
          aria-pressed={mode === "polygon"}
          style={mode === "polygon" ? BTN_ACTIVE : BTN_BASE}
        >
          ポリゴン
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={BTN_BASE}
        >
          GeoJSON読込
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={aoi === null && mode === "none"}
          style={aoi === null && mode === "none" ? BTN_DISABLED : BTN_BASE}
        >
          クリア
        </button>
      </div>

      {mode !== "none" && (
        <div
          style={{
            fontSize: 10,
            color: "#88ccff",
            marginTop: 2,
            lineHeight: 1.4,
            maxWidth: 180,
          }}
        >
          {modeLabel[mode]}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            fontSize: 10,
            color: "#ff8888",
            marginTop: 4,
            lineHeight: 1.4,
            maxWidth: 180,
          }}
        >
          {errorMsg}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".geojson,.json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}
