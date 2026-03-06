import type { CSSProperties } from "react";
import { CUSTOM_SATELLITE_ID } from "../../lib/edu/custom-orbit";
import type { CustomSatelliteCardView } from "../hooks/useEduSatellites";
import "./SatelliteCard.css";

interface CustomSatelliteCardProps {
  satellite: CustomSatelliteCardView;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpenDetails: (id: string) => void;
  onOpenLaunchPanel: () => void;
}

function formatCameraMode(cameraMode: CustomSatelliteCardView["cameraMode"]): string {
  return cameraMode === "detail" ? "よく見える" : "広く見える";
}

export function CustomSatelliteCard({
  satellite,
  selected,
  onSelect,
  onOpenDetails,
  onOpenLaunchPanel,
}: CustomSatelliteCardProps) {
  return (
    <article
      className={`edu-satellite-card edu-satellite-card--custom ${selected ? "is-selected" : ""}`.trim()}
      style={
        {
          "--card-accent": satellite.cardColor,
          "--orbit-accent": satellite.orbitColor,
        } as CSSProperties
      }
      onClick={() => onOpenDetails(CUSTOM_SATELLITE_ID)}
      aria-label="あなたの衛星のカード"
    >
      <header className="edu-satellite-card-header">
        <span className="edu-satellite-card-icon" aria-hidden="true">
          🚀
        </span>
        <h3 className="edu-satellite-card-title">{satellite.displayName}</h3>
      </header>

      <p className="edu-satellite-card-mission">
        {satellite.launched
          ? "今の設計で打ち上げた衛星です。地球の回り方を確かめよう。"
          : "高さ・傾き・カメラ性能を決めて、打ち上げてみよう。"}
      </p>

      <div className="edu-satellite-card-metrics">
        <div className="edu-satellite-card-metric">
          <span className="label">状態</span>
          <span className="value">{satellite.launched ? "打ち上げ済み" : "未打ち上げ"}</span>
        </div>
        <div className="edu-satellite-card-metric">
          <span className="label">高さ</span>
          <span className="value">{satellite.altitudeKm.toLocaleString("ja-JP")} km</span>
        </div>
        <div className="edu-satellite-card-metric">
          <span className="label">傾き</span>
          <span className="value">{satellite.inclinationDeg.toFixed(0)}°</span>
        </div>
        <div className="edu-satellite-card-metric">
          <span className="label">カメラ</span>
          <span className="value">{formatCameraMode(satellite.cameraMode)}</span>
        </div>
        <div className="edu-satellite-card-metric">
          <span className="label">1日で地球を</span>
          <span className="value">
            {satellite.orbitsPerDay !== null ? `${satellite.orbitsPerDay.toFixed(1)} 周` : "-"}
          </span>
        </div>
        <div className="edu-satellite-card-metric">
          <span className="label">日本上空</span>
          <span className="value">
            {satellite.japanPassesPerDay !== null ? `${satellite.japanPassesPerDay} 回` : "-"}
          </span>
        </div>
      </div>

      <div className="edu-satellite-card-actions">
        <button
          type="button"
          className="edu-satellite-card-button primary"
          onClick={(event) => {
            event.stopPropagation();
            if (satellite.launched) {
              onSelect(CUSTOM_SATELLITE_ID);
            } else {
              onOpenLaunchPanel();
            }
          }}
        >
          {satellite.launched ? "この衛星を見る" : "衛星を打ち上げる"}
        </button>
        <button
          type="button"
          className="edu-satellite-card-button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetails(CUSTOM_SATELLITE_ID);
          }}
        >
          くわしく
        </button>
      </div>
    </article>
  );
}
