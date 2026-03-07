import { useState } from "react";
import type { EduSatellite } from "../hooks/useEduSatellites";
import type { DiscoveryScanResult, UseDiscoveryGameResult } from "../hooks/useDiscoveryGame";
import type { DiscoveryStep } from "../types/target-discovery";
import "./DiscoveryMissionBody.css";

const SENSOR_LABEL: Record<EduSatellite["iconType"], string> = {
  optical: "光学",
  sar: "SAR",
  weather: "気象",
};

const STEP_LABELS: { step: DiscoveryStep; label: string }[] = [
  { step: "wide-scan", label: "1. 広くさがす" },
  { step: "detail-scan", label: "2. くわしく見る" },
  { step: "identify", label: "3. 答える" },
];

interface DiscoveryMissionBodyProps {
  satellites: EduSatellite[];
  selectedSatelliteId: string | null;
  onSelectSatellite: (satelliteId: string) => void;
  discovery: UseDiscoveryGameResult;
}

export function DiscoveryMissionBody({
  satellites,
  selectedSatelliteId,
  onSelectSatellite,
  discovery,
}: DiscoveryMissionBodyProps) {
  const { gameState, startGame, submitWideScan, submitDetailScan, submitIdentification, resetGame, identifyChoices } =
    discovery;
  const { step, scenario } = gameState;
  const [scanError, setScanError] = useState<string | null>(null);
  const [identifyError, setIdentifyError] = useState(false);
  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(null);

  const currentStepIndex = STEP_LABELS.findIndex((s) => s.step === step);

  function handleScan() {
    const satellite = satellites.find((s) => s.id === selectedSatelliteId);
    if (!satellite) return;

    let result: DiscoveryScanResult;
    if (step === "wide-scan") {
      result = submitWideScan(satellite.id, satellite.resolution.meters);
    } else {
      result = submitDetailScan(satellite.id, satellite.resolution.meters);
    }

    if (result.success) {
      setScanError(null);
    } else {
      setScanError(result.failureMessage);
    }
  }

  function handleIdentify() {
    if (!selectedCreatureId) return;
    const correct = submitIdentification(selectedCreatureId);
    if (!correct) {
      setIdentifyError(true);
    } else {
      setIdentifyError(false);
    }
  }

  function handleReset() {
    setScanError(null);
    setIdentifyError(false);
    setSelectedCreatureId(null);
    resetGame();
  }

  return (
    <div className="edu-discovery">
      {/* Step indicator */}
      <div className="edu-discovery-steps">
        {STEP_LABELS.map(({ step: s, label }, i) => {
          const isDone =
            s === "wide-scan"
              ? currentStepIndex > 0 || step === "complete"
              : s === "detail-scan"
                ? currentStepIndex > 1 || step === "complete"
                : step === "complete";
          const isActive = s === step;
          return (
            <div key={s} className="edu-discovery-steps-item" style={{ display: "contents" }}>
              {i > 0 && <span className="edu-discovery-step-arrow">&rarr;</span>}
              <div
                className={`edu-discovery-step-chip ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Location banner */}
      <div className="edu-discovery-location">
        <span className="edu-discovery-location-icon">📍</span>
        <span>{scenario.location.nameJa}</span>
      </div>

      {/* === INTRO step === */}
      {step === "intro" && (
        <>
          <p className="edu-discovery-instruction">
            この場所のどこかに不思議な生き物がかくれているよ！
            衛星を使って見つけよう。
          </p>
          <button type="button" className="edu-discovery-start-btn" onClick={startGame}>
            さがしはじめる！
          </button>
        </>
      )}

      {/* === WIDE-SCAN step === */}
      {step === "wide-scan" && (
        <>
          <p className="edu-discovery-instruction">
            まずは広い範囲を見わたせる衛星を選んでスキャンしよう。
            解像度5m以上の衛星がおすすめだよ。
          </p>
          <SatelliteGrid
            satellites={satellites}
            selectedSatelliteId={selectedSatelliteId}
            onSelect={onSelectSatellite}
            recommendFilter={(s) => s.resolution.meters >= 5}
          />
          {scanError && <p className="edu-discovery-error">{scanError}</p>}
          <div className="edu-discovery-action-row">
            <button
              type="button"
              className="edu-discovery-action-btn"
              onClick={handleScan}
              disabled={!selectedSatelliteId}
            >
              この衛星でスキャン！
            </button>
          </div>
        </>
      )}

      {/* === DETAIL-SCAN step === */}
      {step === "detail-scan" && (
        <>
          {gameState.wideScanImageUrl && (
            <div className="edu-discovery-image-frame">
              <img src={gameState.wideScanImageUrl} alt="広域スキャン結果" />
              <p className="edu-discovery-scan-message">
                何かいるみたい...でもぼやけてよく見えない！
              </p>
            </div>
          )}
          <p className="edu-discovery-instruction">
            今度は解像度1m以下の衛星に切り替えて、くっきり見てみよう！
          </p>
          <SatelliteGrid
            satellites={satellites}
            selectedSatelliteId={selectedSatelliteId}
            onSelect={onSelectSatellite}
            recommendFilter={(s) => s.resolution.meters <= 1}
          />
          {scanError && <p className="edu-discovery-error">{scanError}</p>}
          <div className="edu-discovery-action-row">
            <button
              type="button"
              className="edu-discovery-action-btn"
              onClick={handleScan}
              disabled={!selectedSatelliteId}
            >
              この衛星でくわしくスキャン！
            </button>
          </div>
        </>
      )}

      {/* === IDENTIFY step === */}
      {step === "identify" && (
        <>
          {gameState.detailScanImageUrl && (
            <div className="edu-discovery-image-frame">
              <img src={gameState.detailScanImageUrl} alt="詳細スキャン結果" />
              <p className="edu-discovery-scan-message">
                見えた！ これは何の生き物だろう？
              </p>
            </div>
          )}
          <div className="edu-discovery-creature-grid">
            {identifyChoices.map((creature) => (
              <button
                key={creature.id}
                type="button"
                className={`edu-discovery-creature-btn ${selectedCreatureId === creature.id ? "is-selected" : ""}`}
                onClick={() => {
                  setSelectedCreatureId(creature.id);
                  setIdentifyError(false);
                }}
              >
                <span className="edu-discovery-creature-emoji">{creature.emoji}</span>
                <span className="edu-discovery-creature-name">{creature.nameJa}</span>
              </button>
            ))}
          </div>
          {identifyError && <p className="edu-discovery-error">おしい！もう一度よく見てみよう。</p>}
          <div className="edu-discovery-action-row">
            <button
              type="button"
              className="edu-discovery-action-btn"
              onClick={handleIdentify}
              disabled={!selectedCreatureId}
            >
              この生き物で答える！
            </button>
          </div>
        </>
      )}

      {/* === COMPLETE step === */}
      {step === "complete" && (
        <div className="edu-discovery-complete">
          <div className="edu-discovery-complete-emoji">{scenario.creature.emoji}</div>
          <p className="edu-discovery-complete-title">
            {scenario.creature.nameJa}を発見！
          </p>
          <p className="edu-discovery-complete-desc">{scenario.creature.descriptionJa}</p>
          <p className="edu-discovery-complete-lesson">
            広い範囲を見る衛星でさがして、くわしく見る衛星で確認する。
            これが衛星観測の基本だよ！
          </p>
          <button type="button" className="edu-discovery-retry-btn" onClick={handleReset}>
            もういちどチャレンジ！
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Satellite selection grid (shared between wide/detail steps) ── */

function SatelliteGrid({
  satellites,
  selectedSatelliteId,
  onSelect,
  recommendFilter,
}: {
  satellites: EduSatellite[];
  selectedSatelliteId: string | null;
  onSelect: (id: string) => void;
  recommendFilter: (s: EduSatellite) => boolean;
}) {
  return (
    <div className="edu-discovery-satellite-grid">
      {satellites.map((satellite) => {
        const isRecommended = recommendFilter(satellite);
        const isSelected = selectedSatelliteId === satellite.id;
        return (
          <button
            key={satellite.id}
            type="button"
            className={`edu-discovery-sat-btn ${isSelected ? "is-selected" : ""} ${isRecommended ? "is-recommended" : ""}`}
            onClick={() => onSelect(satellite.id)}
          >
            <span className="name">{satellite.displayName}</span>
            <span className="meta">
              {SENSOR_LABEL[satellite.iconType]} / {satellite.resolution.meters}m
              {isRecommended ? " ★" : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
