import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InfoPanel } from "../InfoPanel";

vi.mock("resium", () => ({
  useCesium: () => ({ viewer: undefined }),
}));

describe("InfoPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders mode buttons with correct pressed state", () => {
    render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={vi.fn()}
        showNightShade={false}
        onNightShadeToggle={vi.fn()}
      />
    );

    const geodesic = screen.getByRole("button", { name: "Geodesic" });
    const cartesian = screen.getByRole("button", { name: "Cartesian" });

    expect(geodesic).toHaveAttribute("aria-pressed", "true");
    expect(cartesian).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onOrbitRenderModeChange('cartesian') when Cartesian button is clicked", () => {
    const onOrbitRenderModeChange = vi.fn();
    render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={onOrbitRenderModeChange}
        showNightShade={false}
        onNightShadeToggle={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cartesian" }));
    expect(onOrbitRenderModeChange).toHaveBeenCalledTimes(1);
    expect(onOrbitRenderModeChange).toHaveBeenCalledWith("cartesian");
  });

  it("calls onOrbitRenderModeChange('geodesic') when Geodesic button is clicked", () => {
    const onOrbitRenderModeChange = vi.fn();
    render(
      <InfoPanel
        orbitRenderMode="cartesian"
        onOrbitRenderModeChange={onOrbitRenderModeChange}
        showNightShade={false}
        onNightShadeToggle={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Geodesic" }));
    expect(onOrbitRenderModeChange).toHaveBeenCalledTimes(1);
    expect(onOrbitRenderModeChange).toHaveBeenCalledWith("geodesic");
  });

  it("renders Night Shade button with correct pressed state", () => {
    render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={vi.fn()}
        showNightShade={true}
        onNightShadeToggle={vi.fn()}
      />
    );

    const nightShade = screen.getByRole("button", { name: "Night Shade" });
    expect(nightShade).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onNightShadeToggle when Night Shade button is clicked", () => {
    const onNightShadeToggle = vi.fn();
    render(
      <InfoPanel
        orbitRenderMode="geodesic"
        onOrbitRenderModeChange={vi.fn()}
        showNightShade={false}
        onNightShadeToggle={onNightShadeToggle}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Night Shade" }));
    expect(onNightShadeToggle).toHaveBeenCalledTimes(1);
  });
});
