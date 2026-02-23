import { useRef, useState } from "react";
import type { Aoi, AoiDrawingMode } from "../../types/polygon";

interface Props {
  mode: AoiDrawingMode;
  aoi: Aoi | null;
  onSetMode: (mode: AoiDrawingMode) => void;
  onClear: () => void;
  onLoadGeoJSON: (json: unknown) => { success: true; aoi: Aoi } | { success: false; error: string };
}

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
    <div className="ui-panel aoi-panel">
      <div className="aoi-section">
        <div className="ui-panel-title">AOI</div>
        <div className="ui-panel-subtitle">Area of Interest</div>
      </div>

      <div className="aoi-section aoi-control-row">
        <button
          type="button"
          onClick={() => toggleMode("point")}
          aria-pressed={mode === "point"}
          className={`ui-button ${mode === "point" ? "is-active" : ""}`.trim()}
        >
          ポイント
        </button>
        <button
          type="button"
          onClick={() => toggleMode("polygon")}
          aria-pressed={mode === "polygon"}
          className={`ui-button ${mode === "polygon" ? "is-active" : ""}`.trim()}
        >
          ポリゴン
        </button>
      </div>

      <div className="aoi-section aoi-control-row">
        <button type="button" onClick={() => fileInputRef.current?.click()} className="ui-button">
          GeoJSON読込
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={aoi === null && mode === "none"}
          className={`ui-button is-danger ${aoi === null && mode === "none" ? "is-disabled" : ""}`.trim()}
        >
          クリア
        </button>
      </div>

      {mode !== "none" && <div className="aoi-hint">{modeLabel[mode]}</div>}

      {errorMsg && <div className="aoi-error">{errorMsg}</div>}

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
