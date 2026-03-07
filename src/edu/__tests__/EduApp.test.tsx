import { fireEvent, render, screen } from "@testing-library/react";
import { Cartesian3, JulianDate } from "cesium";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EduApp from "../EduApp";

vi.mock("../components/EduGlobe", () => ({
  EduGlobe: () => <div data-testid="edu-globe" />,
}));

vi.mock("../components/SatelliteInfoModal", () => ({
  SatelliteInfoModal: () => <div data-testid="sat-info-modal" />,
}));

vi.mock("../components/CustomSatelliteInfoModal", () => ({
  CustomSatelliteInfoModal: () => <div data-testid="custom-sat-info-modal" />,
}));

vi.mock("../components/ResolutionSensorLab", () => ({
  __esModule: true,
  default: () => <div data-testid="phase3-lab" />,
}));

vi.mock("../components/SatelliteCardCarousel", () => ({
  SatelliteCardCarousel: ({
    selectedSatelliteId,
    onSelectSatellite,
    onOpenLaunchPanel,
  }: {
    selectedSatelliteId: string | null;
    onSelectSatellite: (id: string) => void;
    onOpenLaunchPanel: () => void;
  }) => (
    <div data-testid="edu-carousel">
      <div data-testid="selected-satellite">{selectedSatelliteId ?? "none"}</div>
      <button type="button" onClick={() => onSelectSatellite("worldview3")}>
        select-worldview3
      </button>
      <button type="button" onClick={onOpenLaunchPanel}>
        open-launch-mode
      </button>
    </div>
  ),
}));

vi.mock("../components/LaunchSimulationPanel", () => ({
  LaunchSimulationPanel: ({
    draft,
    onDraftChange,
    onClose,
  }: {
    draft: { altitudeKm: number };
    onDraftChange: (patch: { altitudeKm: number }) => void;
    onClose: () => void;
  }) => (
    <section data-testid="launch-panel">
      <div data-testid="launch-draft-altitude">{draft.altitudeKm}</div>
      <button type="button" onClick={() => onDraftChange({ altitudeKm: 1800 })}>
        set-draft-1800
      </button>
      <button type="button" onClick={onClose}>
        close-launch-panel
      </button>
    </section>
  ),
}));

vi.mock("../components/MissionChallengePanel", () => ({
  MissionChallengePanel: ({
    activeMissionId,
    selectedSatelliteId,
    onLaunch,
    onSelectMission,
  }: {
    activeMissionId: string;
    selectedSatelliteId: string | null;
    onLaunch: () => void;
    onSelectMission: (missionId: "cover-japan-day" | "rapid-disaster-response") => void;
  }) => (
    <section data-testid="mission-panel">
      <div data-testid="mission-active-id">{activeMissionId}</div>
      <div data-testid="mission-selected-satellite">{selectedSatelliteId ?? "none"}</div>
      <button type="button" onClick={onLaunch}>
        launch-custom
      </button>
      <button type="button" onClick={() => onSelectMission("rapid-disaster-response")}>
        select-mission2
      </button>
    </section>
  ),
}));

describe("EduApp mode switch", () => {
  function createViewerMock() {
    return {
      isDestroyed: () => false,
      trackedEntity: undefined,
      camera: {
        lookAtTransform: vi.fn(),
        flyTo: vi.fn(),
        setView: vi.fn(),
      },
      clock: {
        currentTime: JulianDate.fromDate(new Date("2026-03-07T00:00:00Z")),
      },
      scene: {
        postRender: {
          addEventListener: vi.fn(() => vi.fn()),
        },
      },
      entities: {
        getById: vi.fn(() => ({
          position: {
            getValue: () => new Cartesian3(7_000_000, 0, 0),
          },
        })),
      },
    };
  }

  beforeEach(() => {
    window.__CESIUM_VIEWER__ = undefined;
  });

  afterEach(() => {
    window.__CESIUM_VIEWER__ = undefined;
  });

  it("compare モードで地球儀とカードを非表示にする", async () => {
    render(<EduApp />);

    expect(screen.getByTestId("edu-globe")).toBeInTheDocument();
    expect(screen.getByTestId("edu-carousel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "解像度比較" }));

    expect(screen.queryByTestId("edu-globe")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edu-carousel")).not.toBeInTheDocument();
    expect(await screen.findByTestId("phase3-lab")).toBeInTheDocument();
  });

  it("compare 往復後も観察/打ち上げの状態を保持する", () => {
    render(<EduApp />);

    fireEvent.click(screen.getByRole("button", { name: "select-worldview3" }));
    expect(screen.getByTestId("selected-satellite")).toHaveTextContent("worldview3");

    fireEvent.click(screen.getByRole("tab", { name: "打ち上げ" }));
    expect(screen.getByTestId("launch-draft-altitude")).toHaveTextContent("700");

    fireEvent.click(screen.getByRole("button", { name: "set-draft-1800" }));
    expect(screen.getByTestId("launch-draft-altitude")).toHaveTextContent("1800");

    fireEvent.click(screen.getByRole("tab", { name: "解像度比較" }));
    fireEvent.click(screen.getByRole("tab", { name: "衛星観察" }));
    expect(screen.getByTestId("selected-satellite")).toHaveTextContent("worldview3");

    fireEvent.click(screen.getByRole("tab", { name: "打ち上げ" }));
    expect(screen.getByTestId("launch-draft-altitude")).toHaveTextContent("1800");
  });

  it("mission モードでミッションパネルを表示し、地球儀は維持する", () => {
    render(<EduApp />);

    fireEvent.click(screen.getByRole("button", { name: "select-worldview3" }));
    expect(screen.getByTestId("selected-satellite")).toHaveTextContent("worldview3");

    fireEvent.click(screen.getByRole("tab", { name: "ミッション" }));

    expect(screen.getByTestId("edu-globe")).toBeInTheDocument();
    expect(screen.getByTestId("mission-panel")).toBeInTheDocument();
    expect(screen.getByTestId("mission-selected-satellite")).toHaveTextContent("worldview3");
    expect(screen.queryByTestId("edu-carousel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "衛星観察" }));
    expect(screen.getByTestId("edu-carousel")).toBeInTheDocument();
  });

  it("ミッション1で自作衛星を打ち上げてもカメラ追尾しない", () => {
    const viewer = createViewerMock();
    const { flyTo } = viewer.camera;
    window.__CESIUM_VIEWER__ = viewer as never;

    render(<EduApp />);

    fireEvent.click(screen.getByRole("tab", { name: "ミッション" }));
    expect(screen.getByTestId("mission-active-id")).toHaveTextContent("cover-japan-day");

    fireEvent.click(screen.getByRole("button", { name: "launch-custom" }));

    expect(screen.getByTestId("mission-selected-satellite")).toHaveTextContent("custom-launch");
    expect(flyTo).not.toHaveBeenCalled();
  });

  it("ミッション2では自作衛星の打ち上げ時にカメラ追尾する", () => {
    const viewer = createViewerMock();
    const { flyTo } = viewer.camera;
    window.__CESIUM_VIEWER__ = viewer as never;

    render(<EduApp />);

    fireEvent.click(screen.getByRole("tab", { name: "ミッション" }));
    fireEvent.click(screen.getByRole("button", { name: "select-mission2" }));
    expect(screen.getByTestId("mission-active-id")).toHaveTextContent("rapid-disaster-response");

    fireEvent.click(screen.getByRole("button", { name: "launch-custom" }));

    expect(flyTo).toHaveBeenCalledTimes(1);
  });
});
