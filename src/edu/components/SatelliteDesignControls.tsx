import type { CustomSatelliteDraft, LaunchedCustomSatellite } from "../../lib/edu/custom-orbit";
import "./SatelliteDesignControls.css";

interface SatelliteDesignControlsProps {
  draft: CustomSatelliteDraft;
  launched: LaunchedCustomSatellite | null;
  onDraftChange: (patch: Partial<CustomSatelliteDraft>) => void;
  onLaunch: () => void;
  launchButtonLabel?: string;
}

function formatCameraMode(cameraMode: CustomSatelliteDraft["cameraMode"]): string {
  return cameraMode === "detail" ? "よく見える（せまい）" : "広く見える（ぼんやり）";
}

export function SatelliteDesignControls({
  draft,
  launched,
  onDraftChange,
  onLaunch,
  launchButtonLabel,
}: SatelliteDesignControlsProps) {
  return (
    <>
      <div className="edu-launch-controls">
        <label htmlFor="edu-altitude-slider" className="edu-launch-control">
          <span className="label">高さ</span>
          <span className="value">{draft.altitudeKm.toLocaleString("ja-JP")} km</span>
          <input
            id="edu-altitude-slider"
            type="range"
            min={200}
            max={36000}
            step={50}
            value={draft.altitudeKm}
            onChange={(event) => onDraftChange({ altitudeKm: Number(event.target.value) })}
          />
        </label>

        <label htmlFor="edu-inclination-slider" className="edu-launch-control">
          <span className="label">傾き</span>
          <span className="value">{draft.inclinationDeg.toFixed(0)}°</span>
          <input
            id="edu-inclination-slider"
            type="range"
            min={0}
            max={98}
            step={1}
            value={draft.inclinationDeg}
            onChange={(event) => onDraftChange({ inclinationDeg: Number(event.target.value) })}
          />
        </label>

        <div className="edu-launch-control">
          <span className="label">カメラの性能</span>
          <span className="value">{formatCameraMode(draft.cameraMode)}</span>
          <div className="edu-launch-camera-group" role="group" aria-label="カメラ性能">
            <button
              type="button"
              className={draft.cameraMode === "detail" ? "is-active" : ""}
              onClick={() => onDraftChange({ cameraMode: "detail" })}
              aria-pressed={draft.cameraMode === "detail"}
            >
              よく見える
            </button>
            <button
              type="button"
              className={draft.cameraMode === "wide" ? "is-active" : ""}
              onClick={() => onDraftChange({ cameraMode: "wide" })}
              aria-pressed={draft.cameraMode === "wide"}
            >
              広く見える
            </button>
          </div>
        </div>
      </div>

      <div className="edu-launch-metrics" aria-live="polite">
        <div>
          <span className="label">1日で地球を</span>
          <span className="value">{launched ? `${launched.orbitsPerDay.toFixed(1)} 周` : "まだ打ち上げ前"}</span>
        </div>
        <div>
          <span className="label">日本の上を</span>
          <span className="value">{launched ? `${launched.japanPassesPerDay} 回` : "まだ打ち上げ前"}</span>
        </div>
      </div>

      <button type="button" className="edu-launch-button" onClick={onLaunch}>
        {launchButtonLabel ?? (launched ? "この設計で打ち上げ直す" : "衛星を打ち上げる")}
      </button>
    </>
  );
}
