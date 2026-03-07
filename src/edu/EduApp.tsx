import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Cartesian3, JulianDate, Matrix4, type Entity as CesiumEntity } from "cesium";
import { getWindowStartMs } from "../lib/time-window";
import { evaluateMission } from "../lib/edu/mission-evaluator";
import { CUSTOM_SATELLITE_ID } from "../lib/edu/custom-orbit";
import { CustomSatelliteInfoModal } from "./components/CustomSatelliteInfoModal";
import { EduGlobe, type EduSearchArea } from "./components/EduGlobe";
import { LaunchSimulationPanel } from "./components/LaunchSimulationPanel";
import { MissionChallengePanel } from "./components/MissionChallengePanel";
import { SatelliteCardCarousel } from "./components/SatelliteCardCarousel";
import { SatelliteInfoModal } from "./components/SatelliteInfoModal";
import { getEduSatelliteEntityId } from "./components/edu-entity-id";
import { useDiscoveryGame } from "./hooks/useDiscoveryGame";
import { useMissionChallenge } from "./hooks/useMissionChallenge";
import { useEduSatellites } from "./hooks/useEduSatellites";
import type { EduMode } from "./types/phase3";
import "./EduApp.css";

const ResolutionSensorLab = lazy(() => import("./components/ResolutionSensorLab"));

const EARTH_RADIUS_M = 6_371_000;
const FOLLOW_DISTANCE_MIN_M = 4_200_000;
const FOLLOW_DISTANCE_MAX_M = 18_000_000;
const FOLLOW_DISTANCE_FACTOR = 1.6;

const scratchSatellite = new Cartesian3();
const scratchRadial = new Cartesian3();
const scratchOffset = new Cartesian3();
const scratchDestination = new Cartesian3();
const scratchDirection = new Cartesian3();
const scratchRight = new Cartesian3();
const scratchUp = new Cartesian3();

function resolveFollowView(entity: CesiumEntity, currentTime: JulianDate) {
  const position = entity.position?.getValue(currentTime, scratchSatellite);
  if (!position) return null;

  const distanceFromCenter = Cartesian3.magnitude(position);
  const altitudeM = Math.max(0, distanceFromCenter - EARTH_RADIUS_M);
  const followDistanceM = Math.min(
    FOLLOW_DISTANCE_MAX_M,
    Math.max(FOLLOW_DISTANCE_MIN_M, altitudeM * FOLLOW_DISTANCE_FACTOR),
  );

  const radial = Cartesian3.normalize(position, scratchRadial);
  const offset = Cartesian3.multiplyByScalar(radial, followDistanceM, scratchOffset);
  const destination = Cartesian3.add(position, offset, scratchDestination);

  const direction = Cartesian3.normalize(
    Cartesian3.negate(destination, scratchDirection),
    scratchDirection,
  );

  let right = Cartesian3.cross(direction, Cartesian3.UNIT_Z, scratchRight);
  if (Cartesian3.magnitudeSquared(right) < 1e-8) {
    right = Cartesian3.cross(direction, Cartesian3.UNIT_X, right);
  }
  Cartesian3.normalize(right, right);
  const up = Cartesian3.normalize(Cartesian3.cross(right, direction, scratchUp), scratchUp);

  return {
    destination: Cartesian3.clone(destination),
    direction: Cartesian3.clone(direction),
    up: Cartesian3.clone(up),
  };
}

function EduHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="edu-help-overlay" role="dialog" aria-modal="true">
      <div className="edu-help-panel">
        <h2>つかいかた</h2>
        <ol>
          <li>上のモードで「衛星観察 / 打ち上げ / 解像度比較 / ミッション」を切り替えます。</li>
          <li>衛星観察では、下のカードを選ぶとその衛星を地球儀で追いかけます。</li>
          <li>解像度比較では、光学とSARの見え方の違いを比べられます。</li>
          <li>ミッションでは条件を満たす設計や衛星選択に挑戦できます。</li>
        </ol>
        <button type="button" onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}

function EduApp() {
  const {
    satellites,
    allEduSatellites,
    opticalSatellites,
    sarSatellites,
    customSatellite,
    customDraft,
    launchedCustomSatellite,
    selectedSatelliteId,
    selectionNonce,
    detailSatellite,
    customDetailOpen,
    selectSatellite,
    openDetails,
    closeDetails,
    updateDraft,
    launchCustomSatellite,
  } = useEduSatellites();
  const [showHelp, setShowHelp] = useState(false);
  const [mode, setMode] = useState<EduMode>("observe");
  const [windowStartMs, setWindowStartMs] = useState(() => getWindowStartMs(Date.now()));
  const {
    missions,
    activeMissionId,
    activeMission,
    progress: missionProgress,
    setActiveMission,
    evaluate: evaluateMissionResult,
    reset: resetMissionProgress,
  } = useMissionChallenge();
  const discoveryGame = useDiscoveryGame();
  const selectedIdRef = useRef<string | null>(selectedSatelliteId);
  selectedIdRef.current = selectedSatelliteId;
  const suppressCustomMissionFollow =
    mode === "mission" &&
    activeMissionId === "cover-japan-day" &&
    selectedSatelliteId === CUSTOM_SATELLITE_ID;

  // Discovery mission: search area for globe + auto-evaluate on complete
  const isDiscoveryActive = mode === "mission" && activeMissionId === "target-discovery";
  const discoveryState = discoveryGame.gameState;

  const searchArea = useMemo<EduSearchArea | null>(() => {
    if (!isDiscoveryActive) return null;
    const loc = discoveryState.scenario.location;
    return {
      lonDeg: loc.lonDeg,
      latDeg: loc.latDeg,
      radiusKm: loc.radiusKm,
      locationName: loc.nameJa,
    };
  }, [isDiscoveryActive, discoveryState.scenario.location]);

  // Auto-evaluate when discovery game completes
  useEffect(() => {
    if (!isDiscoveryActive || discoveryState.step !== "complete") return;
    if (missionProgress.clearedMissionIds.includes("target-discovery")) return;

    const evaluation = evaluateMission(activeMission, {
      selectedSatelliteId: null,
      selectedSatelliteIconType: null,
      customDraft,
      launchedCustomSatellite,
      discoveryState,
    });
    evaluateMissionResult(evaluation);
  }, [
    isDiscoveryActive,
    discoveryState.step,
    discoveryState,
    activeMission,
    customDraft,
    launchedCustomSatellite,
    evaluateMissionResult,
    missionProgress.clearedMissionIds,
  ]);

  // Camera fly-to when discovery game enters wide-scan
  useEffect(() => {
    if (!isDiscoveryActive || discoveryState.step !== "wide-scan") return;
    const viewer = window.__CESIUM_VIEWER__;
    if (!viewer || viewer.isDestroyed()) return;
    const loc = discoveryState.scenario.location;
    const altitude = Math.max(loc.radiusKm * 6000, 2_000_000);
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(loc.lonDeg, loc.latDeg, altitude),
      duration: 1.5,
    });
  }, [isDiscoveryActive, discoveryState.step, discoveryState.scenario.location]);

  useEffect(() => {
    if (mode === "compare") return;
    const viewer = window.__CESIUM_VIEWER__;
    if (!viewer || viewer.isDestroyed()) return;

    viewer.trackedEntity = undefined;
    viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    if (!selectedSatelliteId || suppressCustomMissionFollow) return;

    let cancelled = false;
    let attempt = 0;
    let removeFollowListener: (() => void) | null = null;
    const maxAttempts = 40;

    const attachFollow = (entityId: string, selectedId: string) => {
      if (removeFollowListener) return;
      removeFollowListener = viewer.scene.postRender.addEventListener(() => {
        if (cancelled || viewer.isDestroyed()) return;
        if (selectedIdRef.current !== selectedId) return;

        const entity = viewer.entities.getById(entityId);
        if (!entity) return;
        const cameraView = resolveFollowView(entity, viewer.clock.currentTime);
        if (!cameraView) return;

        viewer.camera.setView({
          destination: cameraView.destination,
          orientation: {
            direction: cameraView.direction,
            up: cameraView.up,
          },
        });
      });
    };

    const flyToSelected = () => {
      if (cancelled || viewer.isDestroyed()) return;
      if (!selectedSatelliteId) return;

      const entityId = getEduSatelliteEntityId(selectedSatelliteId);
      const entity = viewer.entities.getById(entityId);
      if (!entity) {
        if (attempt < maxAttempts) {
          attempt += 1;
          requestAnimationFrame(flyToSelected);
        }
        return;
      }

      const cameraView = resolveFollowView(entity, viewer.clock.currentTime);
      if (!cameraView) return;

      viewer.camera.flyTo({
        destination: cameraView.destination,
        orientation: {
          direction: cameraView.direction,
          up: cameraView.up,
        },
        duration: 1.2,
        maximumHeight: 22_000_000,
        complete: () => {
          if (cancelled || selectedIdRef.current !== selectedSatelliteId) return;
          attachFollow(entityId, selectedSatelliteId);
        },
        cancel: () => {
          if (cancelled || selectedIdRef.current !== selectedSatelliteId) return;
          attachFollow(entityId, selectedSatelliteId);
        },
      });
    };

    flyToSelected();

    return () => {
      cancelled = true;
      if (removeFollowListener) {
        removeFollowListener();
      }
    };
  }, [mode, selectedSatelliteId, selectionNonce, suppressCustomMissionFollow]);

  useEffect(() => {
    if (mode !== "compare" && mode !== "mission") return;
    closeDetails();
  }, [closeDetails, mode]);

  const showCatalogCards = mode === "observe" || mode === "launch";
  const showInfoModal = mode === "observe" || mode === "launch";

  return (
    <>
      {mode !== "compare" && (
        <EduGlobe
          satellites={satellites}
          selectedSatelliteId={selectedSatelliteId}
          launchedCustomSatellite={launchedCustomSatellite}
          customCameraMode={customDraft.cameraMode}
          dayStartMs={windowStartMs}
          onWindowStartChange={setWindowStartMs}
          searchArea={searchArea}
        />
      )}

      <div className="edu-layout">
        <header className="edu-header">
          <div className="edu-header-title">
            <h1>宇宙からの目</h1>
            <nav className="edu-mode-tabs" role="tablist" aria-label="学習モード">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "observe"}
                className={mode === "observe" ? "is-active" : ""}
                onClick={() => setMode("observe")}
              >
                衛星観察
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "launch"}
                className={mode === "launch" ? "is-active" : ""}
                onClick={() => setMode("launch")}
              >
                打ち上げ
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "mission"}
                className={mode === "mission" ? "is-active" : ""}
                onClick={() => setMode("mission")}
              >
                ミッション
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "compare"}
                className={mode === "compare" ? "is-active" : ""}
                onClick={() => setMode("compare")}
              >
                解像度比較
              </button>
            </nav>
          </div>
          <button type="button" className="edu-help-button" onClick={() => setShowHelp(true)}>
            ? ヘルプ
          </button>
        </header>

        <main className="edu-main">
          {mode === "launch" && (
            <section className="edu-launch-region">
              <LaunchSimulationPanel
                draft={customDraft}
                launched={launchedCustomSatellite}
                onDraftChange={updateDraft}
                onLaunch={launchCustomSatellite}
                onClose={() => setMode("observe")}
              />
            </section>
          )}

          {mode === "mission" && (
            <section className="edu-mission-region">
              <MissionChallengePanel
                missions={missions}
                activeMissionId={activeMissionId}
                progress={missionProgress}
                satellites={satellites}
                selectedSatelliteId={selectedSatelliteId}
                customDraft={customDraft}
                launchedCustomSatellite={launchedCustomSatellite}
                onSelectMission={setActiveMission}
                onSelectSatellite={selectSatellite}
                onDraftChange={updateDraft}
                onLaunch={launchCustomSatellite}
                onEvaluateMission={evaluateMissionResult}
                onResetProgress={resetMissionProgress}
                discoveryGame={isDiscoveryActive ? discoveryGame : null}
                discoveryState={isDiscoveryActive ? discoveryState : null}
              />
            </section>
          )}

          {mode === "compare" ? (
            <section className="edu-compare-region">
              <Suspense
                fallback={<div className="edu-compare-loading">比較ラボを準備しています…</div>}
              >
                <ResolutionSensorLab
                  allSatellites={allEduSatellites}
                  opticalSatellites={opticalSatellites}
                  sarSatellites={sarSatellites}
                />
              </Suspense>
            </section>
          ) : showCatalogCards ? (
            <>
              <div className="edu-main-spacer" />
              <section className="edu-card-region">
                <SatelliteCardCarousel
                  customSatellite={customSatellite}
                  satellites={satellites}
                  selectedSatelliteId={selectedSatelliteId}
                  onSelectSatellite={selectSatellite}
                  onOpenDetails={openDetails}
                  onOpenLaunchPanel={() => setMode("launch")}
                />
              </section>
            </>
          ) : (
            <div className="edu-main-spacer" />
          )}
        </main>
      </div>

      {showInfoModal && detailSatellite && (
        <SatelliteInfoModal satellite={detailSatellite} onClose={closeDetails} />
      )}
      {showInfoModal && customDetailOpen && (
        <CustomSatelliteInfoModal
          draft={customDraft}
          launched={launchedCustomSatellite}
          onClose={closeDetails}
        />
      )}
      {showHelp && <EduHelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
}

export default EduApp;
