import { render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
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

vi.mock("../components/EduFootprintLayer", () => ({
  EduFootprintLayer: ({ satelliteId }: { satelliteId: string }) => (
    <div data-testid={`fp-${satelliteId}`} />
  ),
}));

vi.mock("../components/EduTimeController", () => ({
  EduTimeController: () => <div data-testid="edu-time" />,
}));

vi.mock("resium", () => ({
  useCesium: () => ({ viewer: undefined }),
}));

describe("EduGlobe", () => {
  it("選択中の衛星のみフットプリントを描画する", () => {
    const { result } = renderHook(() => useEduSatellites());
    const satellites = result.current.satellites.slice(0, 2);

    render(
      <EduGlobe
        satellites={satellites}
        selectedSatelliteId={satellites[1].id}
        dayStartMs={0}
        onWindowStartChange={vi.fn()}
      />,
    );

    expect(screen.queryByTestId(`fp-${satellites[0].id}`)).not.toBeInTheDocument();
    expect(screen.getByTestId(`fp-${satellites[1].id}`)).toBeInTheDocument();
  });
});
