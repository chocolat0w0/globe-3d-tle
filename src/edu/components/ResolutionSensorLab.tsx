import { useEffect, useMemo, useState } from "react";
import type { EduSatellite } from "../hooks/useEduSatellites";
import type { Phase3CompareState, Phase3Weather } from "../types/phase3";
import "./ResolutionSensorLab.css";

interface ResolutionSensorLabProps {
  allSatellites: EduSatellite[];
  opticalSatellites: EduSatellite[];
  sarSatellites: EduSatellite[];
}

type ImagePipelineModule = typeof import("../lib/phase3-image-pipeline");

const DEFAULT_COMPARE_STATE: Phase3CompareState = {
  resolutionSatelliteId: "worldview3",
  opticalSatelliteId: "sentinel2a",
  sarSatelliteId: "sentinel1a",
  weather: "clear",
};

function resolveId(currentId: string, satellites: EduSatellite[]): string {
  if (satellites.some((satellite) => satellite.id === currentId)) return currentId;
  return satellites[0]?.id ?? currentId;
}

interface Phase3ImageUrlOptions {
  satelliteId: string;
  resolutionMeters: number;
  weather: Phase3Weather;
  kind: "resolution" | "optical" | "sar";
}

function usePhase3ImageUrl(
  pipeline: ImagePipelineModule | null,
  options: Phase3ImageUrlOptions,
): string | null {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pipeline) {
      setImageUrl(null);
      return;
    }

    const url = pipeline.getPhase3ImageDataUrl({
      satelliteId: options.satelliteId,
      resolutionMeters: options.resolutionMeters,
      weather: options.weather,
      kind: options.kind,
    });
    setImageUrl(url);
  }, [pipeline, options.kind, options.resolutionMeters, options.satelliteId, options.weather]);

  return imageUrl;
}

export function ResolutionSensorLab({
  allSatellites,
  opticalSatellites,
  sarSatellites,
}: ResolutionSensorLabProps) {
  const [pipeline, setPipeline] = useState<ImagePipelineModule | null>(null);
  const [compareState, setCompareState] = useState<Phase3CompareState>(DEFAULT_COMPARE_STATE);

  useEffect(() => {
    let active = true;
    import("../lib/phase3-image-pipeline").then((module) => {
      if (!active) return;
      setPipeline(module);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setCompareState((previous) => {
      const next: Phase3CompareState = {
        ...previous,
        resolutionSatelliteId: resolveId(previous.resolutionSatelliteId, allSatellites),
        opticalSatelliteId: resolveId(previous.opticalSatelliteId, opticalSatellites),
        sarSatelliteId: resolveId(previous.sarSatelliteId, sarSatellites),
      };
      if (
        next.resolutionSatelliteId === previous.resolutionSatelliteId &&
        next.opticalSatelliteId === previous.opticalSatelliteId &&
        next.sarSatelliteId === previous.sarSatelliteId
      ) {
        return previous;
      }
      return next;
    });
  }, [allSatellites, opticalSatellites, sarSatellites]);

  const allById = useMemo(
    () =>
      new Map<string, EduSatellite>(allSatellites.map((satellite) => [satellite.id, satellite])),
    [allSatellites],
  );

  const resolutionSatellite =
    allById.get(compareState.resolutionSatelliteId) ?? allSatellites[0] ?? null;
  const opticalSatellite =
    allById.get(compareState.opticalSatelliteId) ?? opticalSatellites[0] ?? null;
  const sarSatellite = allById.get(compareState.sarSatelliteId) ?? sarSatellites[0] ?? null;

  const resolutionImage = usePhase3ImageUrl(
    pipeline,
    resolutionSatellite
      ? {
          satelliteId: resolutionSatellite.id,
          resolutionMeters: resolutionSatellite.resolution.meters,
          weather: "clear",
          kind: "resolution",
        }
      : {
          satelliteId: "worldview3",
          resolutionMeters: 0.3,
          weather: "clear",
          kind: "resolution",
        },
  );

  const opticalImage = usePhase3ImageUrl(
    pipeline,
    opticalSatellite
      ? {
          satelliteId: opticalSatellite.id,
          resolutionMeters: opticalSatellite.resolution.meters,
          weather: compareState.weather,
          kind: "optical",
        }
      : {
          satelliteId: "sentinel2a",
          resolutionMeters: 10,
          weather: compareState.weather,
          kind: "optical",
        },
  );

  const sarImage = usePhase3ImageUrl(
    pipeline,
    sarSatellite
      ? {
          satelliteId: sarSatellite.id,
          resolutionMeters: sarSatellite.resolution.meters,
          weather: compareState.weather,
          kind: "sar",
        }
      : {
          satelliteId: "sentinel1a",
          resolutionMeters: 5,
          weather: compareState.weather,
          kind: "sar",
        },
  );

  if (!resolutionSatellite || !opticalSatellite || !sarSatellite) {
    return (
      <section className="edu-phase3-lab" aria-label="解像度とセンサー比較">
        <p>衛星データを読み込み中です…</p>
      </section>
    );
  }

  return (
    <section className="edu-phase3-lab" aria-label="解像度とセンサー比較">
      <header className="edu-phase3-header">
        <div>
          <h2>解像度・センサー比較ラボ</h2>
          <p>学校のまわり（サンプル地点）を使って、見え方の違いを体験しよう。</p>
        </div>
        <div className="edu-phase3-location">対象地点: 学校のまわり（サンプル地点）</div>
      </header>

      <article className="edu-phase3-section">
        <div className="edu-phase3-section-heading">
          <h3>解像度体験</h3>
          <label htmlFor="edu-phase3-resolution-satellite">
            比較する衛星
            <select
              id="edu-phase3-resolution-satellite"
              value={compareState.resolutionSatelliteId}
              onChange={(event) =>
                setCompareState((previous) => ({
                  ...previous,
                  resolutionSatelliteId: event.target.value,
                }))
              }
            >
              {allSatellites.map((satellite) => (
                <option key={satellite.id} value={satellite.id}>
                  {satellite.displayName}（{satellite.resolution.meters}m）
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="edu-phase3-resolution-grid">
          <figure className="edu-phase3-image-frame">
            {resolutionImage ? (
              <img
                src={resolutionImage}
                alt={`${resolutionSatellite.displayName}の解像度体験画像`}
                loading="lazy"
              />
            ) : (
              <div className="edu-phase3-image-placeholder">画像を生成中…</div>
            )}
            <figcaption>
              {resolutionSatellite.displayName} / {resolutionSatellite.resolution.meters}m
            </figcaption>
          </figure>

          <div className="edu-phase3-resolution-copy">
            <p>
              解像度が小さいほど細かく見えます。目安として
              <strong>0.3m / 10m / 500m</strong> を比べると、見える情報量の違いが分かります。
            </p>
            <ul>
              <li>0.3m: 車や小さな物の形まで分かる</li>
              <li>10m: 建物や道路の配置が分かる</li>
              <li>500m: 町や地形の大きなまとまりが分かる</li>
            </ul>
            <p className="edu-phase3-current-note">
              いまの選択: {resolutionSatellite.resolution.comparison}
            </p>
          </div>
        </div>
      </article>

      <article className="edu-phase3-section">
        <div className="edu-phase3-section-heading">
          <h3>光学 vs SAR</h3>
          <div className="edu-phase3-compare-controls">
            <label htmlFor="edu-phase3-optical-satellite">
              光学衛星
              <select
                id="edu-phase3-optical-satellite"
                value={compareState.opticalSatelliteId}
                onChange={(event) =>
                  setCompareState((previous) => ({
                    ...previous,
                    opticalSatelliteId: event.target.value,
                  }))
                }
              >
                {opticalSatellites.map((satellite) => (
                  <option key={satellite.id} value={satellite.id}>
                    {satellite.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="edu-phase3-sar-satellite">
              SAR衛星
              <select
                id="edu-phase3-sar-satellite"
                value={compareState.sarSatelliteId}
                onChange={(event) =>
                  setCompareState((previous) => ({
                    ...previous,
                    sarSatelliteId: event.target.value,
                  }))
                }
              >
                {sarSatellites.map((satellite) => (
                  <option key={satellite.id} value={satellite.id}>
                    {satellite.displayName}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={`edu-phase3-weather-button ${compareState.weather === "cloudy" ? "is-cloudy" : ""}`.trim()}
              onClick={() =>
                setCompareState((previous) => ({
                  ...previous,
                  weather: previous.weather === "clear" ? "cloudy" : "clear",
                }))
              }
              aria-pressed={compareState.weather === "cloudy"}
            >
              天気: {compareState.weather === "clear" ? "はれ" : "くもり"}
            </button>
          </div>
        </div>

        <div className="edu-phase3-compare-grid">
          <section className="edu-phase3-sensor-panel optical">
            <h4>光学（目で見たのと近い写真）</h4>
            {opticalImage ? (
              <img
                src={opticalImage}
                alt={`${opticalSatellite.displayName}の光学比較画像`}
                loading="lazy"
              />
            ) : (
              <div className="edu-phase3-image-placeholder">画像を生成中…</div>
            )}
            <p>
              太陽の光を使って撮るので、色が分かりやすい。<strong>雲があると見えにくい</strong>。
            </p>
            {compareState.weather === "cloudy" && (
              <div className="edu-phase3-weather-note">くもり: 地面が白くかくれています</div>
            )}
          </section>

          <section className="edu-phase3-sensor-panel sar">
            <h4>SAR（電波で撮る白黒画像）</h4>
            {sarImage ? (
              <img src={sarImage} alt={`${sarSatellite.displayName}のSAR比較画像`} loading="lazy" />
            ) : (
              <div className="edu-phase3-image-placeholder">画像を生成中…</div>
            )}
            <p>
              電波を使うため、<strong>雲があっても夜でも観測できる</strong>。
            </p>
            <div className="edu-phase3-weather-note">くもりでも見え方はほぼ変わりません</div>
          </section>
        </div>
      </article>
    </section>
  );
}

export default ResolutionSensorLab;
