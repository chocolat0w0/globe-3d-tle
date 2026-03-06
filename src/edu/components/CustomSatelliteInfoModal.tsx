import type { CustomSatelliteDraft, LaunchedCustomSatellite } from "../../lib/edu/custom-orbit";
import { useCustomSatelliteRealtime } from "../hooks/useCustomSatelliteRealtime";
import "./CustomSatelliteInfoModal.css";

interface CustomSatelliteInfoModalProps {
  draft: CustomSatelliteDraft;
  launched: LaunchedCustomSatellite | null;
  onClose: () => void;
}

function formatCoordinate(value: number, positive: string, negative: string): string {
  const direction = value >= 0 ? positive : negative;
  return `${Math.abs(value).toFixed(2)}°${direction}`;
}

function formatCameraMode(cameraMode: CustomSatelliteDraft["cameraMode"]): string {
  return cameraMode === "detail" ? "よく見える（せまい範囲）" : "広く見える（広い範囲）";
}

export function CustomSatelliteInfoModal({
  draft,
  launched,
  onClose,
}: CustomSatelliteInfoModalProps) {
  const realtime = useCustomSatelliteRealtime(launched);
  const source = launched ?? draft;

  return (
    <div className="edu-custom-modal-overlay" role="dialog" aria-modal="true">
      <section className="edu-custom-modal-panel">
        <button
          type="button"
          className="edu-custom-modal-close"
          onClick={onClose}
          aria-label="閉じる"
        >
          ✕
        </button>

        <div className="edu-custom-modal-left">
          <h2>あなたの衛星</h2>
          <p className="edu-custom-modal-mission">
            自分で設計した衛星です。高さ・傾き・カメラ性能を変えると、地球の回り方が変わります。
          </p>

          <div className="edu-custom-modal-grid">
            <div>
              <div className="key">高さ</div>
              <div className="value">{source.altitudeKm.toLocaleString("ja-JP")} km</div>
            </div>
            <div>
              <div className="key">傾き</div>
              <div className="value">{source.inclinationDeg.toFixed(0)}°</div>
            </div>
            <div>
              <div className="key">カメラ性能</div>
              <div className="value">{formatCameraMode(source.cameraMode)}</div>
            </div>
            <div>
              <div className="key">打ち上げ状態</div>
              <div className="value">{launched ? "打ち上げ済み" : "まだ打ち上げ前"}</div>
            </div>
          </div>

          <div className="edu-custom-modal-note">
            打ち上げボタンを押すと、この設計で軌道と指標が更新されます。
          </div>
        </div>

        <div className="edu-custom-modal-right">
          <h3>結果</h3>
          {launched ? (
            <>
              <div className="edu-custom-modal-result-list">
                <div>
                  <span className="key">1日で地球を回る回数</span>
                  <span className="value">{launched.orbitsPerDay.toFixed(1)} 周</span>
                </div>
                <div>
                  <span className="key">日本の上を通る回数</span>
                  <span className="value">{launched.japanPassesPerDay} 回</span>
                </div>
                <div>
                  <span className="key">地球1周の時間</span>
                  <span className="value">{launched.orbitPeriodMin.toFixed(1)} 分</span>
                </div>
                <div>
                  <span className="key">速度</span>
                  <span className="value">{launched.speedKmS.toFixed(2)} km/s</span>
                </div>
              </div>

              <h4>いまどこを飛んでいる？</h4>
              {realtime ? (
                <div className="edu-custom-modal-result-list realtime">
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
                    <span className="value">{realtime.speedKmS.toFixed(2)} km/s</span>
                  </div>
                </div>
              ) : (
                <p className="edu-custom-modal-empty">位置情報を計算しています…</p>
              )}
            </>
          ) : (
            <p className="edu-custom-modal-empty">
              まだ打ち上げていません。左の設定を決めて「この設計で打ち上げる」を押してください。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
