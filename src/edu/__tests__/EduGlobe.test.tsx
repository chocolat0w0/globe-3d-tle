import { render, screen } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CUSTOM_SATELLITE_ID } from "../../lib/edu/custom-orbit";
import { EduGlobe } from "../components/EduGlobe";
import { useEduSatellites } from "../hooks/useEduSatellites";

vi.mock("../../components/Globe/GlobeRenderer", () => ({
  GlobeRenderer: ({ children }: { children?: ReactNode }) => (
    <div data-testid="mock-globe">{children}</div>
  ),
}));

vi.mock("../../components/Globe/BaseMapLayer", () => ({
  BaseMapLayer: () => <div data-testid="base-map" />,
}));

vi.mock("../components/EduSatelliteLayer", () => ({
  EduSatelliteLayer: ({ id }: { id: string }) => <div data-testid={`sat-${id}`} />,
}));

vi.mock("../components/EduCustomSatelliteLayer", () => ({
  EduCustomSatelliteLayer: () => <div data-testid="custom-sat" />,
}));

vi.mock("../components/EduFootprintLayer", () => ({
  EduFootprintLayer: ({ satelliteId }: { satelliteId: string }) => (
    <div data-testid={`fp-${satelliteId}`} />
  ),
}));

vi.mock("../components/EduCustomFootprintLayer", () => ({
  EduCustomFootprintLayer: () => <div data-testid="custom-fp" />,
}));

vi.mock("../components/EduTimeController", () => ({
  EduTimeController: () => <div data-testid="edu-time" />,
}));

vi.mock("resium", () => ({
  useCesium: () => ({ viewer: undefined }),
}));

describe("EduGlobe", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("選択中の既存衛星のみフットプリントを描画する", () => {
    const { result } = renderHook(() => useEduSatellites());
    const satellites = result.current.satellites.slice(0, 2);

    render(
      <EduGlobe
        satellites={satellites}
        selectedSatelliteId={satellites[1].id}
        launchedCustomSatellite={null}
        dayStartMs={0}
        onWindowStartChange={vi.fn()}
      />,
    );

    expect(screen.queryByTestId(`fp-${satellites[0].id}`)).not.toBeInTheDocument();
    expect(screen.getByTestId(`fp-${satellites[1].id}`)).toBeInTheDocument();
    expect(screen.queryByTestId("custom-fp")).not.toBeInTheDocument();
  });

  it("自作衛星が選択されたときに自作フットプリントを描画する", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 2, 6, 9, 0, 0));
    const { result } = renderHook(() => useEduSatellites());

    act(() => {
      result.current.launchCustomSatellite();
    });

    render(
      <EduGlobe
        satellites={result.current.satellites.slice(0, 2)}
        selectedSatelliteId={CUSTOM_SATELLITE_ID}
        launchedCustomSatellite={result.current.launchedCustomSatellite}
        dayStartMs={0}
        onWindowStartChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("custom-sat")).toBeInTheDocument();
    expect(screen.getByTestId("custom-fp")).toBeInTheDocument();
  });
});
