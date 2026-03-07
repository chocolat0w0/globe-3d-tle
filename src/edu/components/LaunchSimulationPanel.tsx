import type { CustomSatelliteDraft, LaunchedCustomSatellite } from "../../lib/edu/custom-orbit";
import { SatelliteDesignControls } from "./SatelliteDesignControls";
import "./LaunchSimulationPanel.css";

interface LaunchSimulationPanelProps {
  draft: CustomSatelliteDraft;
  launched: LaunchedCustomSatellite | null;
  onDraftChange: (patch: Partial<CustomSatelliteDraft>) => void;
  onLaunch: () => void;
  onClose: () => void;
}

export function LaunchSimulationPanel({
  draft,
  launched,
  onDraftChange,
  onLaunch,
  onClose,
}: LaunchSimulationPanelProps) {
  return (
    <section className="edu-launch-panel" aria-label="打ち上げシミュレーション">
      <div className="edu-launch-header">
        <div className="edu-launch-header-top">
          <h2>打ち上げシミュレーション</h2>
          <button
            type="button"
            className="edu-launch-close-button"
            onClick={onClose}
            aria-label="打ち上げシミュレーションを閉じる"
          >
            ✕
          </button>
        </div>
        <p>自分の衛星を設計して、地球のまわり方を見てみよう</p>
      </div>

      <SatelliteDesignControls
        draft={draft}
        launched={launched}
        onDraftChange={onDraftChange}
        onLaunch={onLaunch}
      />
    </section>
  );
}
