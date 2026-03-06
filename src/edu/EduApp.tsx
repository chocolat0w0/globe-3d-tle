import { useEffect, useRef, useState } from "react";
import { Cartesian3, JulianDate, Matrix4, type Entity as CesiumEntity } from "cesium";
import { getWindowStartMs } from "../lib/time-window";
import { EduGlobe } from "./components/EduGlobe";
import { SatelliteCardCarousel } from "./components/SatelliteCardCarousel";
import { SatelliteInfoModal } from "./components/SatelliteInfoModal";
import { getEduSatelliteEntityId } from "./components/edu-entity-id";
import { useEduSatellites } from "./hooks/useEduSatellites";
import "./EduApp.css";

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
          <li>下のカードをえらぶと、その衛星を地球儀で追いかけます。</li>
          <li>「くわしく」を押すと、図鑑のページを開けます。</li>
          <li>時間コントロールで、衛星の動く速さを変えられます。</li>
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
    selectedSatelliteId,
    detailSatellite,
    selectSatellite,
    openDetails,
    closeDetails,
  } = useEduSatellites();
  const [showHelp, setShowHelp] = useState(false);
  const [windowStartMs, setWindowStartMs] = useState(() => getWindowStartMs(Date.now()));
  const selectedIdRef = useRef<string | null>(selectedSatelliteId);
  selectedIdRef.current = selectedSatelliteId;

  useEffect(() => {
    const viewer = window.__CESIUM_VIEWER__;
    if (!viewer || viewer.isDestroyed()) return;

    viewer.trackedEntity = undefined;
    viewer.camera.lookAtTransform(Matrix4.IDENTITY);
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
  }, [selectedSatelliteId]);

  return (
    <>
      <EduGlobe
        satellites={satellites}
        selectedSatelliteId={selectedSatelliteId}
        dayStartMs={windowStartMs}
        onWindowStartChange={setWindowStartMs}
      />

      <div className="edu-layout">
        <header className="edu-header">
          <h1>宇宙からの目</h1>
          <button type="button" onClick={() => setShowHelp(true)}>
            ? ヘルプ
          </button>
        </header>

        <main className="edu-main">
          <div className="edu-main-spacer" />
          <section className="edu-card-region">
            <SatelliteCardCarousel
              satellites={satellites}
              selectedSatelliteId={selectedSatelliteId}
              onSelectSatellite={selectSatellite}
              onOpenDetails={openDetails}
            />
          </section>
        </main>
      </div>

      {detailSatellite && <SatelliteInfoModal satellite={detailSatellite} onClose={closeDetails} />}
      {showHelp && <EduHelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
}

export default EduApp;
