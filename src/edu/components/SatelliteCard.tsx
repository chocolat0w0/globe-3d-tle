import type { CSSProperties } from "react";
import type { EduSatellite } from "../hooks/useEduSatellites";
import "./SatelliteCard.css";

const ICON_BY_TYPE: Record<EduSatellite["iconType"], string> = {
  optical: "📷",
  sar: "📡",
  weather: "🌤",
};

interface SatelliteCardProps {
  satellite: EduSatellite;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpenDetails: (id: string) => void;
}

export function SatelliteCard({
  satellite,
  selected,
  onSelect,
  onOpenDetails,
}: SatelliteCardProps) {
  const missionSummary = satellite.missionDescription.split("。")[0]?.trim();

  return (
    <article
      className={`edu-satellite-card ${selected ? "is-selected" : ""}`.trim()}
      style={
        {
          "--card-accent": satellite.cardColor,
          "--orbit-accent": satellite.orbitColor,
        } as CSSProperties
      }
      onClick={() => onSelect(satellite.id)}
      aria-label={`${satellite.displayName} のカード`}
    >
      <header className="edu-satellite-card-header">
        <span className="edu-satellite-card-icon" aria-hidden="true">
          {ICON_BY_TYPE[satellite.iconType]}
        </span>
        <h3 className="edu-satellite-card-title">{satellite.displayName}</h3>
      </header>

      <p className="edu-satellite-card-mission">
        {missionSummary ? `${missionSummary}。` : satellite.missionDescription}
      </p>

      <div className="edu-satellite-card-metrics">
        <div className="edu-satellite-card-metric">
          <span className="label">種類</span>
          <span className="value">{satellite.sensorType.type}</span>
        </div>
        <div className="edu-satellite-card-metric">
          <span className="label">高さ</span>
          <span className="value">{satellite.altitude.km.toLocaleString("ja-JP")} km</span>
        </div>
        <div className="edu-satellite-card-metric">
          <span className="label">速さ</span>
          <span className="value">秒速 {satellite.speedKmS.toFixed(1)} km</span>
        </div>
        <div className="edu-satellite-card-metric">
          <span className="label">見える大きさ</span>
          <span className="value">{satellite.resolution.meters} m</span>
        </div>
      </div>

      <div className="edu-satellite-card-actions">
        <button
          type="button"
          className="edu-satellite-card-button primary"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(satellite.id);
          }}
        >
          この衛星を見る
        </button>
        <button
          type="button"
          className="edu-satellite-card-button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetails(satellite.id);
          }}
        >
          くわしく
        </button>
      </div>
    </article>
  );
}
