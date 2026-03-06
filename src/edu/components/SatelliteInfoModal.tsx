import { useMemo } from "react";
import { extractOrbitalElements } from "../../lib/tle/orbital-elements";
import { useSatelliteRealtime } from "../../hooks/useSatelliteRealtime";
import type { EduSatellite } from "../hooks/useEduSatellites";
import "./SatelliteInfoModal.css";

interface SatelliteInfoModalProps {
  satellite: EduSatellite;
  onClose: () => void;
}

function formatCoordinate(value: number, positive: string, negative: string): string {
  const direction = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(2)}°${direction}`;
}

export function SatelliteInfoModal({ satellite, onClose }: SatelliteInfoModalProps) {
  const realtime = useSatelliteRealtime(satellite.tle);
  const orbitalElements = useMemo(
    () => extractOrbitalElements(satellite.tle.line1, satellite.tle.line2),
    [satellite.tle.line1, satellite.tle.line2],
  );

  return (
    <div className="edu-modal-overlay" role="dialog" aria-modal="true">
      <section className="edu-modal-panel">
        <button type="button" className="edu-modal-close" onClick={onClose} aria-label="閉じる">
          ✕
        </button>

        <div className="edu-modal-left">
          <h2>{satellite.displayName}</h2>
          <p className="edu-modal-mission">{satellite.missionDescription}</p>

          <div className="edu-modal-grid">
            <div>
              <div className="key">運用機関</div>
              <div className="value">{satellite.operator}</div>
            </div>
            <div>
              <div className="key">運用地域</div>
              <div className="value">{satellite.origin}</div>
            </div>
            <div>
              <div className="key">高さ</div>
              <div className="value">
                {satellite.altitude.km.toLocaleString("ja-JP")} km
                <br />
                <span>{satellite.altitude.comparison}</span>
              </div>
            </div>
            <div>
              <div className="key">見える大きさ</div>
              <div className="value">
                {satellite.resolution.meters} m
                <br />
                <span>{satellite.resolution.comparison}</span>
              </div>
            </div>
            <div>
              <div className="key">センサー</div>
              <div className="value">{satellite.sensorType.explanation}</div>
            </div>
            <div>
              <div className="key">地球1周の時間</div>
              <div className="value">{satellite.orbitalPeriodMin.toFixed(1)} 分</div>
            </div>
          </div>

          <div className="edu-modal-capabilities">
            <h3>この衛星でわかること</h3>
            <ul>
              {satellite.capabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </div>

          <div className="edu-modal-fact">
            <strong>豆知識:</strong> {satellite.funFact}
          </div>
        </div>

        <div className="edu-modal-right">
          <h3>いまどこを飛んでいる？</h3>
          {realtime ? (
            <div className="edu-modal-realtime-list">
              <div>
                <span className="key">緯度</span>
                <span className="value">{formatCoordinate(realtime.latDeg, "N", "S")}</span>
              </div>
              <div>
                <span className="key">経度</span>
                <span className="value">{formatCoordinate(realtime.lonDeg, "E", "W")}</span>
              </div>
              <div>
                <span className="key">高度</span>
                <span className="value">{realtime.altKm.toFixed(1)} km</span>
              </div>
              <div>
                <span className="key">速度</span>
                <span className="value">
                  {realtime.speedKmS.toFixed(2)} km/s
                  <small>{satellite.speedComparison}</small>
                </span>
              </div>
            </div>
          ) : (
            <p>位置情報を計算しています…</p>
          )}

          <div className="edu-modal-right-note">
            <h4>衛星のきほん情報</h4>
            <p>地球を回る角度: {orbitalElements.inclinationDeg.toFixed(1)}°</p>
            <p>軌道の丸さ: {orbitalElements.eccentricity.toFixed(4)}</p>
            <p>概算高度: {orbitalElements.altitudeKm.toFixed(1)} km</p>
          </div>
        </div>
      </section>
    </div>
  );
}
