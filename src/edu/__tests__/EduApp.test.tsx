import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
  MissionChallengePanel: ({ selectedSatelliteId }: { selectedSatelliteId: string | null }) => (
    <section data-testid="mission-panel">
      <div data-testid="mission-selected-satellite">{selectedSatelliteId ?? "none"}</div>
    </section>
  ),
}));

describe("EduApp mode switch", () => {
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
});
